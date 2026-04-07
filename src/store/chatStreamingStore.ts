import { create } from "zustand";
import { AdminAgentMessage } from "@/app/api/chat/model";
import { StreamMessageResponse } from "@/types";
import { enableMapSet, produce } from "immer";

enableMapSet();


class TaskInfo {
  isFocused: boolean = true;
  // messagesBuffer 用于存储当前流式处理过程中解析出的消息， key为 taskId 用以去重和覆盖更新
  public messagesBuffer: AdminAgentMessage[] = [];
  constructor() {
    this.isFocused = true;
    this.messagesBuffer = [];
  }
}

const THROTTLE_TIME = 60;
type TaskThrottle = {
  inThrottle: boolean;
  throttleBuffer: AdminAgentMessage[]; // 当 inThrottle===true 时在其中存下待发送的消息
  throttleTimer: NodeJS.Timeout | null;
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
  send: (taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => void;
  cancel: (taskId: string) => void;
  offline: (taskId: string) => void;
  online: () => void;
  terminateAllTasks: () => void;
}

export const useChatStreamingStore = create<ChatStreamingState>((set, get) => ({
  workersAllowed: false,
  setWorkersAllowed: (workersAllowed: boolean) => set({ workersAllowed }),
  streamingWorker: null,
  initWorker: () => {
    if (get().streamingWorker) return;
    const streamingWorker = new Worker(new URL("@/workers/chatStreamingWorker.ts", import.meta.url));
    // 接收到流式处理 worker 的消息
    streamingWorker.onmessage = (event: MessageEvent<StreamMessageResponse>) => {
      if (!get().tasksProcessingMap.has(event.data.id)) return; // todo: 无对应任务时的错误处理
      if (!get().tasksThrottleMap.has(event.data.id)) {
        set({
          tasksThrottleMap: produce(get().tasksThrottleMap, (draft) => {
            draft.set(event.data.id, {
              inThrottle: false,
              throttleBuffer: [],
              throttleTimer: null,
            });
          }),
        });
      }
      if (event.data.type === "message") {
        const messages = event.data.data as AdminAgentMessage[];
        const tasksThrottleMap = produce(get().tasksThrottleMap, (draft) => {
          const throttle = draft.get(event.data.id) as TaskThrottle;
          // 节流期间将最新消息存入 buffer
          if (throttle.inThrottle) throttle.throttleBuffer = messages;
          // 非节流期间直接存入 task 的 messagesBuffer 以供 UI 更新
          else {
            const tasksProcessingMap = produce(get().tasksProcessingMap, (draft) => {
              const task = draft.get(event.data.id) as TaskInfo;
              task.messagesBuffer = messages;
            });
            set({ tasksProcessingMap });
            // 开始节流
            throttle.inThrottle = true;
            const throttleTimer = setTimeout(() => { // 节流 Timer
              // 一段时间后, 若 task 仍存在则执行去节流操作
              if (get().tasksProcessingMap.has(event.data.id) && get().tasksThrottleMap.has(event.data.id)) {
                set({
                  tasksThrottleMap: produce(get().tasksThrottleMap, (draft) => {
                    const throttle = draft.get(event.data.id) as TaskThrottle;
                    // 将 buffer 刷入 task 中
                    set({
                      tasksProcessingMap: produce(get().tasksProcessingMap, (draft) => {
                        (draft.get(event.data.id) as TaskInfo).messagesBuffer = throttle.throttleBuffer;
                      })
                    });
                    throttle.inThrottle = false;
                    throttle.throttleBuffer = [];
                    // 清除 timer
                    clearTimeout(throttle.throttleTimer as NodeJS.Timeout);
                    throttle.throttleTimer = null;
                  })
                });
              }
            }, THROTTLE_TIME);
            throttle.throttleTimer = throttleTimer;
          }
        });
        set({ tasksThrottleMap });
      } else if (event.data.type === "complete" || event.data.type === "canceled") {
        // 流式处理 worker 完成
        set({
          tasksThrottleMap: produce(get().tasksThrottleMap, (draft) => {
            const throttle = draft.get(event.data.id) as TaskThrottle;
            if (throttle.throttleBuffer.length > 0) {
              // 将残余的 throttle buffer 刷入 task 并通知 UI
              set({
                tasksProcessingMap: produce(get().tasksProcessingMap, (draft) => {
                  (draft.get(event.data.id) as TaskInfo).messagesBuffer = throttle.throttleBuffer;
                })
              }); // 在删除前先通知一次 UI 用于更新 UI 状态
            }
            if (throttle.inThrottle) clearTimeout(throttle.throttleTimer as NodeJS.Timeout);
            draft.delete(event.data.id);
          })
        });
        set({
          tasksProcessingMap: produce(get().tasksProcessingMap, (draft) => {
            draft.delete(event.data.id);
          })
        });
      } else {
        // 流式处理 worker 出错
        // todo: 错误处理
        set({
          tasksThrottleMap: produce(get().tasksThrottleMap, (draft) => {
            const throttle = draft.get(event.data.id) as TaskThrottle;
            if (throttle.throttleBuffer.length > 0) {
              // 将残余的 throttle buffer 刷入 task 并通知 UI
              set({
                tasksProcessingMap: produce(get().tasksProcessingMap, (draft) => {
                  (draft.get(event.data.id) as TaskInfo).messagesBuffer = throttle.throttleBuffer;
                })
              }); // 在删除前先通知一次 UI 用于更新 UI 状态
            }
            if (throttle.inThrottle) clearTimeout(throttle.throttleTimer as NodeJS.Timeout);
            draft.delete(event.data.id);
          })
        });
        set({
          tasksProcessingMap: produce(get().tasksProcessingMap, (draft) => {
            draft.delete(event.data.id);
          })
        });
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
  send: (taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => {
    // 创建任务信息
    const task = new TaskInfo();
    set((state) => {
      const tasksProcessingMap = new Map(state.tasksProcessingMap);
      tasksProcessingMap.set(taskId, task);
      const tasksThrottleMap = new Map(state.tasksThrottleMap);
      tasksThrottleMap.set(taskId, {
        inThrottle: false,
        throttleBuffer: [],
        throttleTimer: null,
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
  offline: (taskId: string) => {
    set((state) => {
      const tasksProcessingMap = new Map(state.tasksProcessingMap);
      const task = tasksProcessingMap.get(taskId);
      const streamingWorker = state.streamingWorker;
      if (task && streamingWorker) {
        streamingWorker.postMessage({
          type: "offline",
          id: taskId,
        });
        task.isFocused = false;
      }
      return { tasksProcessingMap };
    });
  },
  online: () => {

  },
  terminateAllTasks: () => {
    const streamingWorker = get().streamingWorker;
    if (streamingWorker) {
      streamingWorker.postMessage({
        type: "cancelAll",
        id: "",
      });
    }
    set({
      tasksProcessingMap: new Map<string, TaskInfo>(),
      tasksThrottleMap: new Map<string, TaskThrottle>()
    });
  }
}));