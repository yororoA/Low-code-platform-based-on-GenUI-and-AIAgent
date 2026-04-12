import { create } from "zustand";
import { AdminAgentMessage } from "@/app/api/chat/model";
import { StreamMessageResponse } from "@/types";
import { enableMapSet, produce } from "immer";
import { DataItem, DataItemSummary } from "@/types";
import { DBManager, dispatchEvent, getShowResponsePayload } from "@/lib/utils";

enableMapSet();

interface TaskInfo {
  isFocused: boolean;
  status: "submitted" | "streaming" | "completed" | "canceled" | "error";
  userInput: AdminAgentMessage | null;
  // messagesBuffer 用于存储当前流式处理过程中解析出的消息， key为 taskId 用以去重和覆盖更新
  messagesBuffer: AdminAgentMessage[];
}

const THROTTLE_TIME = 60;
const CACHE_DEBOUNCE_TIMEOUT = 1000;
type TaskThrottle = {
  inThrottle: boolean;
  throttleBuffer: AdminAgentMessage[]; // 当 inThrottle===true 时在其中存下待发送的消息
  throttleTimer: ReturnType<typeof setTimeout> | null;
};

type OfflinePersistInfo = {
  timer: ReturnType<typeof setTimeout> | null;
  latestMessages: AdminAgentMessage[];
  userInput: AdminAgentMessage | null;
};

const offlinePersistMap = new Map<string, OfflinePersistInfo>();

function getTopicFromMessages(messages: AdminAgentMessage[], fallbackTopic = "New Conversation"): string {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    const payload = getShowResponsePayload(assistantMessages[i]) as { topic?: string } | undefined;
    if (payload?.topic) return payload.topic;
  }
  return fallbackTopic;
}

function mergeMessagesById(messages: AdminAgentMessage[]): AdminAgentMessage[] {
  const indexById = new Map<string, number>();
  const result: AdminAgentMessage[] = [];
  for (const message of messages) {
    const existedIndex = indexById.get(message.id);
    if (existedIndex == null) {
      indexById.set(message.id, result.length);
      result.push(message);
    } else {
      result[existedIndex] = message;
    }
  }
  return result;
}

async function persistTaskHistory(
  taskId: string,
  messages: AdminAgentMessage[],
  userInputFromCache?: AdminAgentMessage | null,
): Promise<void> {
  const { taskToPromptMap, tasksProcessingMap } = useChatStreamingStore.getState();
  const promptId = taskToPromptMap.get(taskId);
  if (!promptId) return;

  const existed = (await DBManager.execute({
    operationType: "get",
    id: promptId,
  })) as DataItem | undefined;

  const task = tasksProcessingMap.get(taskId);
  const userInput = userInputFromCache ?? task?.userInput ?? null;
  const mergedMessages = mergeMessagesById([
    ...(existed?.messages ?? []),
    ...(userInput ? [userInput] : []),
    ...messages,
  ]);
  if (mergedMessages.length === 0) return;

  const data: DataItem = {
    id: promptId,
    topic: getTopicFromMessages(mergedMessages, existed?.topic ?? "New Conversation"),
    timestamp: existed?.timestamp ?? new Date(),
    messages: mergedMessages,
  };

  await DBManager.execute({
    operationType: "update",
    data,
  });

  if (existed) dispatchEvent<DataItemSummary>("updateConversation", data);
}

function flushOfflinePersist(taskId: string): void {
  const cached = offlinePersistMap.get(taskId);
  if (!cached) return;
  if (cached.timer) clearTimeout(cached.timer);
  const latestMessages = cached.latestMessages;
  const userInput = cached.userInput;
  offlinePersistMap.delete(taskId);
  void persistTaskHistory(taskId, latestMessages, userInput).catch((error) => {
    console.error("offline history persist failed:", error);
  });
}

function scheduleOfflinePersist(taskId: string, messages: AdminAgentMessage[], immediate = false): void {
  const taskUserInput = useChatStreamingStore.getState().tasksProcessingMap.get(taskId)?.userInput ?? null;
  let cached = offlinePersistMap.get(taskId);
  if (!cached) {
    cached = {
      timer: null,
      latestMessages: messages,
      userInput: taskUserInput,
    };
    offlinePersistMap.set(taskId, cached);
  } else {
    cached.latestMessages = messages;
    if (!cached.userInput) cached.userInput = taskUserInput;
  }

  const flush = async () => {
    const latest = offlinePersistMap.get(taskId);
    if (!latest) return;
    latest.timer = null;
    const latestMessages = latest.latestMessages;
    const userInput = latest.userInput;
    try {
      await persistTaskHistory(taskId, latestMessages, userInput);
    } catch (error) {
      console.error("offline history persist failed:", error);
    } finally {
      const current = offlinePersistMap.get(taskId);
      if (current && current.timer === null && current.latestMessages === latestMessages) {
        offlinePersistMap.delete(taskId);
      }
    }
  };

  if (immediate) {
    flushOfflinePersist(taskId);
    return;
  }

  if (cached.timer) return;
  cached.timer = setTimeout(() => {
    void flush();
  }, CACHE_DEBOUNCE_TIMEOUT);
}

// todo: 将其他 worker 的相关管理也移入此 store
interface ChatStreamingState {
  workersAllowed: boolean;
  setWorkersAllowed: (workersAllowed: boolean) => void;
  streamingWorker: Worker | null;
  initWorker: () => void;
  confirmWorkerInitialized: () => Worker;
  terminateWorker: () => void;
  tasksProcessingMap: Map<string, TaskInfo>;
  tasksThrottleMap: Map<string, TaskThrottle>;
  promptToTaskMap: Map<string, string>;
  taskToPromptMap: Map<string, string>;
  send: (promptId: string, taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => void;
  cancel: (taskId: string) => void;
  onlineStatusToggle: (taskId: string, status: "online" | "offline") => void;
  cce: (taskId: string, status: TaskInfo["status"]) => void; // 在清除某个 task 前将残余 buffer 刷入 task 并延迟删除
  terminateTask: (taskId?: string) => void;
}

export const useChatStreamingStore = create<ChatStreamingState>((set, get) => ({
  workersAllowed: false,
  setWorkersAllowed: (workersAllowed: boolean) => set({ workersAllowed }),
  streamingWorker: null,
  cce: (taskId: string, status: TaskInfo["status"]) => {
    // 在清除 task | throttle 前触发更新提醒前端 UI 状态保存
    // 无论 offline/online, task 都正常更新, 具体清理操作由前端根据不同状态自行决定时机调用 terminateTask 来完成
    set((state) => {
      const tasksProcessingMap = produce(state.tasksProcessingMap, (draft) => {
        const task = draft.get(taskId);
        const throttle = state.tasksThrottleMap.get(taskId);
        // 将可能存在的 buffer 刷入 task
        if (task && throttle) {
          if (throttle.throttleBuffer.length > 0) task.messagesBuffer = throttle.throttleBuffer;
          if (throttle.inThrottle) clearTimeout(throttle.throttleTimer as ReturnType<typeof setTimeout>);
          task.status = status;
        }
      });
      return { tasksProcessingMap };
    });
  },
  initWorker: () => {
    if (get().streamingWorker) return;
    const streamingWorker = new Worker(new URL("@/workers/chatStreamingWorker.ts", import.meta.url));
    // 接收到流式处理 worker 的消息
    streamingWorker.onmessage = (event: MessageEvent<StreamMessageResponse>) => {
      const taskId = event.data.id;
      const { tasksProcessingMap, tasksThrottleMap } = get();
      if (!tasksProcessingMap.has(taskId)) return; // todo: 无对应任务时的错误处理
      if (!tasksThrottleMap.has(taskId)) { // 确保节流任务被正确初始化
        set((state) => ({
          tasksThrottleMap: produce(state.tasksThrottleMap, (draft: Map<string, TaskThrottle>) => {
            draft.set(taskId, {
              inThrottle: false,
              throttleBuffer: [],
              throttleTimer: null,
            });
          }),
        }));
      }
      if (event.data.type === "message") {
        const messages = event.data.data as AdminAgentMessage[];
        const taskSnapshot = get().tasksProcessingMap.get(taskId);
        if (taskSnapshot && !taskSnapshot.isFocused) {
          scheduleOfflinePersist(taskId, messages);
        }
        const currentThrottle = get().tasksThrottleMap.get(taskId);
        if (!currentThrottle) return;
        if (currentThrottle.inThrottle) {
          // 节流期间将最新消息存入 buffer
          set((state) => ({
            tasksThrottleMap: produce(state.tasksThrottleMap, (draft: Map<string, TaskThrottle>) => {
              draft.get(taskId)!.throttleBuffer = messages;
            })
          }))
        } else { // 非节流期间
          // 节流 timer
          const throttleTimer = setTimeout(() => {
            if (get().tasksThrottleMap.has(taskId) && get().tasksProcessingMap.has(taskId)) {
              // 节流结束时将 buffer 刷入 task 并解除节流
              const tasksProcessingMap = produce(get().tasksProcessingMap, (draft: Map<string, TaskInfo>) => {
                const task = draft.get(taskId)!;
                const throttle = get().tasksThrottleMap.get(taskId)!;
                if (throttle.throttleBuffer.length > 0) task.messagesBuffer = throttle.throttleBuffer;
              });
              const tasksThrottleMap = produce(get().tasksThrottleMap, (draft: Map<string, TaskThrottle>) => {
                const throttle = draft.get(taskId)!;
                throttle.throttleBuffer = [];
                throttle.inThrottle = false; // 解除节流
                throttle.throttleTimer = null;
              });
              set({ tasksProcessingMap, tasksThrottleMap });
            }
          }, THROTTLE_TIME);

          set((state) => {
            // 将残余的 buffer 刷入 task
            const tasksProcessingMap = produce(state.tasksProcessingMap, (draft) => {
              const task = draft.get(taskId)!
              task.messagesBuffer = messages;
              task.status = "streaming";
            });
            // 开始节流
            const tasksThrottleMap = produce(state.tasksThrottleMap, (draft) => {
              draft.set(taskId, {
                inThrottle: true,
                throttleBuffer: [],
                throttleTimer: throttleTimer,
              });
            });
            return { tasksProcessingMap, tasksThrottleMap };
          })
        }
      } else if (event.data.type === "complete" || event.data.type === "canceled") {
        // 流式处理 worker 完成/取消
        const taskSnapshot = get().tasksProcessingMap.get(taskId);
        if (taskSnapshot && !taskSnapshot.isFocused) {
          const throttle = get().tasksThrottleMap.get(taskId);
          const latestMessages =
            throttle && throttle.throttleBuffer.length > 0
              ? throttle.throttleBuffer
              : taskSnapshot.messagesBuffer;
          scheduleOfflinePersist(taskId, latestMessages, true);
        }
        get().cce(taskId, event.data.type === "complete" ? "completed" : "canceled");
      } else {
        // 流式处理 worker 出错
        // todo: 错误处理
        get().cce(taskId, "error");
        throw new Error(event.data.error);
      }
    };
    set({ streamingWorker });
  },
  confirmWorkerInitialized: () => {
    const streamingWorker = get().streamingWorker;
    if (!streamingWorker) {
      get().initWorker();
      return get().streamingWorker as Worker; // 确保返回非null的worker实例
    } else return streamingWorker;
  },
  terminateWorker() {
    set((state) => {
      state.streamingWorker?.terminate();
      return { streamingWorker: null };
    });
  },
  tasksProcessingMap: new Map<string, TaskInfo>(),
  tasksThrottleMap: new Map<string, TaskThrottle>(),
  promptToTaskMap: new Map<string, string>(),
  taskToPromptMap: new Map<string, string>(),
  send: (promptId: string, taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => {
    // promptId-taskId 映射
    set((state) => {
      const oldTaskIdForPrompt = state.promptToTaskMap.get(promptId);
      const oldPromptIdForTask = state.taskToPromptMap.get(taskId);
      const promptToTaskMap = produce(state.promptToTaskMap, (draft) => {
        if (oldPromptIdForTask) draft.delete(oldPromptIdForTask);
        draft.set(promptId, taskId);
      });
      const taskToPromptMap = produce(state.taskToPromptMap, (draft) => {
        if (oldTaskIdForPrompt) draft.delete(oldTaskIdForPrompt);
        draft.set(taskId, promptId);
      });
      return { promptToTaskMap, taskToPromptMap };
    });
    // 创建任务信息
    const userInput = [...messages].reverse().find((message) => message.role === "user") ?? null;
    const task: TaskInfo = {
      isFocused: true,
      status: "submitted",
      userInput,
      messagesBuffer: [],
    };
    set((state) => {
      const tasksProcessingMap = produce(state.tasksProcessingMap, (draft) => {
        draft.set(taskId, task);
      });
      const tasksThrottleMap = produce(state.tasksThrottleMap, (draft) => {
        draft.set(taskId, {
          inThrottle: false,
          throttleBuffer: [],
          throttleTimer: null,
        });
      });
      return { tasksProcessingMap, tasksThrottleMap };
    });
    const streamingWorker = get().confirmWorkerInitialized();
    // 发送消息给流式处理 worker
    streamingWorker.postMessage({
      type: "send",
      id: taskId,
      messages,
      apiBaseUrl
    });
  },
  cancel: (taskId: string) => {
    const task = get().tasksProcessingMap.get(taskId);
    const streamingWorker = get().streamingWorker;
    if (task && streamingWorker) {
      streamingWorker.postMessage({
        type: "cancel",
        id: taskId,
      });
    }
  },
  onlineStatusToggle: (taskId: string, status: "online" | "offline") => {
    set((state) => {
      const streamingWorker = state.streamingWorker;
      if (state.tasksProcessingMap.has(taskId) && streamingWorker) {
        streamingWorker.postMessage({
          type: status,
          id: taskId,
        });
        const tasksProcessingMap = produce(state.tasksProcessingMap, (draft) => {
          const task = draft.get(taskId)!;
          task.isFocused = status === "online";
        });
        return { tasksProcessingMap };
      }
      return state;
    });
  },
  terminateTask: (taskId?: string) => {
    const streamingWorker = get().streamingWorker;
    if (streamingWorker) {
      if (!taskId) {
        // 删除所有任务
        streamingWorker.postMessage({
          type: "cancelAll",
          id: "",
        });
        for (const offlineTaskId of [...offlinePersistMap.keys()]) {
          flushOfflinePersist(offlineTaskId);
        }
        set((state) => ({
          tasksProcessingMap: produce(state.tasksProcessingMap, (draft) => draft.clear()),
          tasksThrottleMap: produce(state.tasksThrottleMap, (draft) => {
            for (const throttle of draft.values()) {
              if (throttle.inThrottle) clearTimeout(throttle.throttleTimer as ReturnType<typeof setTimeout>);
            }
            draft.clear()
          }),
          promptToTaskMap: produce(state.promptToTaskMap, (draft) => {
            draft.clear();
          }),
          taskToPromptMap: produce(state.taskToPromptMap, (draft) => {
            draft.clear();
          }),
        }));
      } else {
        // 删除特定的任务
        flushOfflinePersist(taskId);
        const task = get().tasksProcessingMap.get(taskId);
        // 完结态不向 streaming worker 发送 cancel 操作 ( woker 在完结时已自动清除其内部 task map 中对应 task )
        if (task && !(task.status === "completed" || task.status === "canceled" || task.status === "error")) {
          streamingWorker.postMessage({
            type: "cancel",
            id: taskId,
          });
        }
        set((state) => ({
          tasksProcessingMap: produce(state.tasksProcessingMap, (draft) => {
            if (draft.has(taskId)) draft.delete(taskId);
          }),
          tasksThrottleMap: produce(state.tasksThrottleMap, (draft) => {
            const throttle = draft.get(taskId);
            if (throttle) {
              if (throttle.inThrottle) clearTimeout(throttle.throttleTimer as ReturnType<typeof setTimeout>);
              draft.delete(taskId);
            }
          }),
          taskToPromptMap: produce(state.taskToPromptMap, (draft) => {
            draft.delete(taskId);
          }),
          promptToTaskMap: produce(state.promptToTaskMap, (draft) => {
            for (const [promptId, existedTaskId] of draft.entries()) {
              if (existedTaskId === taskId) {
                draft.delete(promptId);
                break;
              }
            }
          }),
        }));
      }
    }
  },
}));