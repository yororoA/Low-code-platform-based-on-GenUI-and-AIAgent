import { create } from "zustand";
import { AdminAgentMessage } from "@/app/api/chat/model";
import { StreamMessageResponse } from "@/types";
import { enableMapSet, produce } from "immer";

enableMapSet();

interface TaskInfo {
  isFocused: boolean;
  status: "submitted" | "streaming" | "completed" | "canceled" | "error";
  // messagesBuffer 用于存储当前流式处理过程中解析出的消息， key为 taskId 用以去重和覆盖更新
  messagesBuffer: AdminAgentMessage[];
}

const THROTTLE_TIME = 60;
type TaskThrottle = {
  inThrottle: boolean;
  throttleBuffer: AdminAgentMessage[]; // 当 inThrottle===true 时在其中存下待发送的消息
  throttleTimer: ReturnType<typeof setTimeout> | null;
};

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
    const task: TaskInfo = {
      isFocused: true,
      status: "submitted",
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