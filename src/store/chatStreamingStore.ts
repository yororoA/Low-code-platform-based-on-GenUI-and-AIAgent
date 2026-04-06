import { create } from "zustand";
import { AdminAgentMessage } from "@/app/api/chat/model";
import { StreamMessageResponse } from "@/types";


class TaskInfo {
  isFocused: boolean = true;
  // messagesBuffer 用于存储当前流式处理过程中解析出的消息， key为 taskId 用以去重和覆盖更新
  public messagesBuffer: AdminAgentMessage[] = [];
  constructor(public taskId: string) {
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
      const tasksProcessingMap = new Map(get().tasksProcessingMap);
      const tasksThrottleMap = new Map(get().tasksThrottleMap);
      const task = tasksProcessingMap.get(event.data.id);
      const throttle = tasksThrottleMap.get(event.data.id) as TaskThrottle;
      if (!task) return; // todo: 无对应任务时的错误处理
      if (event.data.type === "message") {
        const messages = event.data.data as AdminAgentMessage[];
        if (throttle.inThrottle) { // 节流期间
          throttle.throttleBuffer = messages;
          return;
        } else { // 非节流期间
          task.messagesBuffer = messages;
          // 开始节流
          throttle.inThrottle = true;
          const throttleTimer = setTimeout(() => {
            const processingMapInTimer = new Map(get().tasksProcessingMap);
            const task = processingMapInTimer.get(event.data.id);
            const throttleMapInTimer = new Map(get().tasksThrottleMap);
            const throttle = throttleMapInTimer.get(event.data.id);
            if (throttle && task) {
              throttle.inThrottle = false;
              task.messagesBuffer = throttle.throttleBuffer;
              throttle.throttleBuffer = [];
              clearTimeout(throttle.throttleTimer as NodeJS.Timeout);
              throttle.throttleTimer = null;
              set({ tasksProcessingMap: processingMapInTimer, tasksThrottleMap: throttleMapInTimer });
            }
          }, THROTTLE_TIME);
          throttle.throttleTimer = throttleTimer;
        }
      } else if (event.data.type === "complete") {
        // 流式处理 worker 完成
        const throttleBuffer = throttle.throttleBuffer;
        if (throttleBuffer.length > 0) task.messagesBuffer = throttleBuffer;
        set({tasksProcessingMap}); // 在删除前先通知一次 UI 用于更新 UI 状态
        clearTimeout(throttle.throttleTimer as NodeJS.Timeout);
        tasksProcessingMap.delete(event.data.id);
        tasksThrottleMap.delete(event.data.id);
      } else if (event.data.type === 'canceled') {
        clearTimeout(throttle.throttleTimer as NodeJS.Timeout);
        tasksProcessingMap.delete(event.data.id);
        tasksThrottleMap.delete(event.data.id);
      } else {
        // 流式处理 worker 出错
        // todo: 错误处理
        clearTimeout(throttle.throttleTimer as NodeJS.Timeout);
        tasksProcessingMap.delete(event.data.id);
        tasksThrottleMap.delete(event.data.id);
        set({ tasksProcessingMap, tasksThrottleMap });
        throw new Error(event.data.error);
      }
      set({ tasksProcessingMap, tasksThrottleMap });
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
    const task = new TaskInfo(taskId);
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