import { create } from "zustand";
import { type AgentMessage, type ShowResponseData } from "@/types";
import { enableMapSet, produce } from "immer";
import { DataItem, DataItemSummary } from "@/types";
import { DBManager, dispatchEvent, generateHexId } from "@/lib/utils";

enableMapSet();

interface TaskInfo {
  isFocused: boolean;
  status: "submitted" | "streaming" | "completed" | "canceled" | "error";
  userInput: AgentMessage | null;
  messagesBuffer: AgentMessage[];
}

const THROTTLE_TIME = 60;
type TaskThrottle = {
  inThrottle: boolean;
  throttleBuffer: AgentMessage[];
  throttleTimer: ReturnType<typeof setTimeout> | null;
};

const promptPersistQueue = new Map<string, Promise<void>>();

function getTopicFromMessages(messages: AgentMessage[], fallbackTopic = "New Conversation"): string {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    for (const part of assistantMessages[i].parts) {
      if (part.type === "show-response" && part.data.topic) {
        return part.data.topic;
      }
    }
  }
  return fallbackTopic;
}

function mergeMessagesById(messages: AgentMessage[]): AgentMessage[] {
  const indexById = new Map<string, number>();
  const result: AgentMessage[] = [];
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

function hasMessageOrPartGrowth(prevMessages: AgentMessage[], nextMessages: AgentMessage[]): boolean {
  if (nextMessages.length > prevMessages.length) return true;
  const prevById = new Map<string, AgentMessage>();
  for (const message of prevMessages) prevById.set(message.id, message);
  for (const message of nextMessages) {
    const prev = prevById.get(message.id);
    if (!prev) return true;
    const prevParts = prev.parts?.length ?? 0;
    const nextParts = message.parts?.length ?? 0;
    if (nextParts > prevParts) return true;
  }
  return false;
}

function queuePersistPromptData(data: DataItem): void {
  const previous = promptPersistQueue.get(data.id) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      await DBManager.execute({
        operationType: "update",
        data,
      });
      dispatchEvent<DataItemSummary>("updateConversation", data);
    })
    .catch((error) => {
      console.error("prompt history persist failed:", error);
    });

  promptPersistQueue.set(data.id, current);
  void current.finally(() => {
    if (promptPersistQueue.get(data.id) === current) {
      promptPersistQueue.delete(data.id);
    }
  });
}

function mergeTaskAssistantMessages(
  existedMessages: AgentMessage[],
  taskId: string,
  taskMessages: AgentMessage[],
): AgentMessage[] {
  if (taskMessages.length === 0) return existedMessages;
  const nextTaskMessage = taskMessages[taskMessages.length - 1];
  const nextMessages = [...existedMessages];
  const existedTaskMessageIndex = nextMessages.findIndex((message) => message.id === taskId);
  if (existedTaskMessageIndex === -1) {
    nextMessages.push(nextTaskMessage);
    return nextMessages;
  }
  nextMessages[existedTaskMessageIndex] = nextTaskMessage;
  return nextMessages;
}

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
  promptDataMap: Map<string, DataItem>;
  initPromptData: (promptId: string, history: DataItem) => void;
  send: (promptId: string, taskId: string, messages: AgentMessage[], apiBaseUrl: string) => void;
  cancel: (taskId: string) => void;
  onlineStatusToggle: (taskId: string, status: "online" | "offline") => void;
  cce: (taskId: string, status: TaskInfo["status"]) => void;
  terminateTask: (taskId?: string) => void;
}

export const useChatStreamingStore = create<ChatStreamingState>((set, get) => ({
  workersAllowed: false,
  setWorkersAllowed: (workersAllowed: boolean) => set({ workersAllowed }),
  streamingWorker: null,
  cce: (taskId: string, status: TaskInfo["status"]) => {
    set((state) => {
      const tasksProcessingMap = produce(state.tasksProcessingMap, (draft) => {
        const task = draft.get(taskId);
        const throttle = state.tasksThrottleMap.get(taskId);
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
    streamingWorker.onmessage = (event: MessageEvent) => {
      const { id, type, data, error } = event.data as { id: string; type: string; data?: AgentMessage[]; error?: string };
      const { tasksProcessingMap, tasksThrottleMap } = get();
      if (!tasksProcessingMap.has(id)) return;
      if (!tasksThrottleMap.has(id)) {
        set((state) => ({
          tasksThrottleMap: produce(state.tasksThrottleMap, (draft: Map<string, TaskThrottle>) => {
            draft.set(id, {
              inThrottle: false,
              throttleBuffer: [],
              throttleTimer: null,
            });
          }),
        }));
      }
      if (type === "message") {
        const messages = data as AgentMessage[];
        const promptId = get().taskToPromptMap.get(id);
        if (promptId) {
          const existedData = get().promptDataMap.get(promptId);
          const prevMessages = existedData?.messages ?? [];
          const nextMessages = mergeTaskAssistantMessages(prevMessages, id, messages);
          const nextData: DataItem = {
            id: promptId,
            topic: getTopicFromMessages(nextMessages, existedData?.topic ?? "New Conversation"),
            timestamp: existedData?.timestamp ?? new Date(),
            messages: nextMessages,
          };
          set((state) => ({
            promptDataMap: produce(state.promptDataMap, (draft) => {
              draft.set(promptId, nextData);
            }),
          }));
          if (hasMessageOrPartGrowth(prevMessages, nextMessages)) {
            queuePersistPromptData(nextData);
          }
        }
        const currentThrottle = get().tasksThrottleMap.get(id);
        if (!currentThrottle) return;
        if (currentThrottle.inThrottle) {
          set((state) => ({
            tasksThrottleMap: produce(state.tasksThrottleMap, (draft: Map<string, TaskThrottle>) => {
              draft.get(id)!.throttleBuffer = messages;
            })
          }));
        } else {
          const throttleTimer = setTimeout(() => {
            if (get().tasksThrottleMap.has(id) && get().tasksProcessingMap.has(id)) {
              const tasksProcessingMap = produce(get().tasksProcessingMap, (draft: Map<string, TaskInfo>) => {
                const task = draft.get(id)!;
                const throttle = get().tasksThrottleMap.get(id)!;
                if (throttle.throttleBuffer.length > 0) task.messagesBuffer = throttle.throttleBuffer;
              });
              const tasksThrottleMap = produce(get().tasksThrottleMap, (draft: Map<string, TaskThrottle>) => {
                const throttle = draft.get(id)!;
                throttle.throttleBuffer = [];
                throttle.inThrottle = false;
                throttle.throttleTimer = null;
              });
              set({ tasksProcessingMap, tasksThrottleMap });
            }
          }, THROTTLE_TIME);

          set((state) => {
            const tasksProcessingMap = produce(state.tasksProcessingMap, (draft) => {
              const task = draft.get(id)!;
              task.messagesBuffer = messages;
              task.status = "streaming";
            });
            const tasksThrottleMap = produce(state.tasksThrottleMap, (draft) => {
              draft.set(id, {
                inThrottle: true,
                throttleBuffer: [],
                throttleTimer: throttleTimer,
              });
            });
            return { tasksProcessingMap, tasksThrottleMap };
          });
        }
      } else if (type === "complete" || type === "canceled") {
        const promptId = get().taskToPromptMap.get(id);
        if (promptId) {
          const data = get().promptDataMap.get(promptId);
          if (data) queuePersistPromptData(data);
        }
        get().cce(id, type === "complete" ? "completed" : "canceled");
      } else {
        const promptId = get().taskToPromptMap.get(id);
        if (promptId) {
          const data = get().promptDataMap.get(promptId);
          if (data) queuePersistPromptData(data);
        }
        get().cce(id, "error");
        throw new Error(error);
      }
    };
    set({ streamingWorker });
  },
  confirmWorkerInitialized: () => {
    const streamingWorker = get().streamingWorker;
    if (!streamingWorker) {
      get().initWorker();
      return get().streamingWorker as Worker;
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
  promptDataMap: new Map<string, DataItem>(),
  initPromptData: (promptId: string, history: DataItem) => {
    set((state) => ({
      promptDataMap: produce(state.promptDataMap, (draft) => {
        draft.set(promptId, {
          ...history,
          messages: mergeMessagesById(history.messages),
        });
      }),
    }));
  },
  send: (promptId: string, taskId: string, messages: AgentMessage[], apiBaseUrl: string) => {
    const promptDataBeforeSend = get().promptDataMap.get(promptId);
    const prevMessages = promptDataBeforeSend?.messages ?? [];
    const oldTaskIdForPrompt = get().promptToTaskMap.get(promptId);
    if (oldTaskIdForPrompt && oldTaskIdForPrompt !== taskId) {
      const oldTask = get().tasksProcessingMap.get(oldTaskIdForPrompt);
      if (
        oldTask &&
        oldTask.status !== "completed" &&
        oldTask.status !== "canceled" &&
        oldTask.status !== "error" &&
        get().streamingWorker
      ) {
        get().streamingWorker?.postMessage({
          type: "cancel",
          id: oldTaskIdForPrompt,
        });
      }
      set((state) => ({
        tasksProcessingMap: produce(state.tasksProcessingMap, (draft) => {
          draft.delete(oldTaskIdForPrompt);
        }),
        tasksThrottleMap: produce(state.tasksThrottleMap, (draft) => {
          const throttle = draft.get(oldTaskIdForPrompt);
          if (throttle?.inThrottle) {
            clearTimeout(throttle.throttleTimer as ReturnType<typeof setTimeout>);
          }
          draft.delete(oldTaskIdForPrompt);
        }),
        taskToPromptMap: produce(state.taskToPromptMap, (draft) => {
          draft.delete(oldTaskIdForPrompt);
        }),
      }));
    }

    set((state) => {
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
      const existedData = state.promptDataMap.get(promptId);
      const nextMessages = mergeMessagesById([...(existedData?.messages ?? []), ...messages]);
      const promptDataMap = produce(state.promptDataMap, (draft) => {
        draft.set(promptId, {
          id: promptId,
          topic: getTopicFromMessages(nextMessages, existedData?.topic ?? "New Conversation"),
          timestamp: existedData?.timestamp ?? new Date(),
          messages: nextMessages,
        });
      });
      return { tasksProcessingMap, tasksThrottleMap, promptDataMap };
    });

    const latestData = get().promptDataMap.get(promptId);
    if (latestData && hasMessageOrPartGrowth(prevMessages, latestData.messages)) {
      queuePersistPromptData(latestData);
    }

    const streamingWorker = get().confirmWorkerInitialized();
    streamingWorker.postMessage({
      type: "send",
      id: taskId,
      messages,
      apiBaseUrl,
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
            draft.clear();
          }),
          promptToTaskMap: produce(state.promptToTaskMap, (draft) => draft.clear()),
          taskToPromptMap: produce(state.taskToPromptMap, (draft) => draft.clear()),
        }));
      } else {
        const task = get().tasksProcessingMap.get(taskId);
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
