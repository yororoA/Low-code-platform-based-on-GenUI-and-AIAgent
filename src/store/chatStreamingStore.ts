import { create } from "zustand";
import { AdminAgentMessage } from "@/app/api/chat/model";
import { StreamMessageResponse } from "@/types";


type TaskInfo = {
  buffer: string;
  isFocused: boolean;
  // messagesBuffer 用于存储当前流式处理过程中解析出的消息， key为 taskId 用以去重和覆盖更新
  messagesBuffer: AdminAgentMessage[];
}
// todo: 将其他 worker 的相关管理也移入此 store
interface ChatStreamingState {
  streamingWorker: Worker | null;
  initStreamingWorker: () => void; // 初始化 worker
  confirmWorkerInitialized: () => Worker; // 确保 worker 已被初始化
  terminateStreamingWorker: () => void; // 终止 worker
  tasksProcessingMap: Map<string, TaskInfo>;
  send: (taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => void;
  cancel: (taskId: string) => void;
  offline: (taskId: string) => void;
  online: () => void;
}

export const useChatStreamingStore = create<ChatStreamingState>((set, get) => ({
  streamingWorker: null,
  initStreamingWorker: () => {
    set(state => {
      if (state.streamingWorker) return state; // 已经初始化过了
      const streamingWorker = new Worker(new URL("@/workers/chatStreamingWorker.ts", import.meta.url));
      return { streamingWorker };
    });
  },
  confirmWorkerInitialized: () => {
    const streamingWorker = get().streamingWorker;
    if (!streamingWorker) {
      get().initStreamingWorker();
      return get().streamingWorker as Worker; // 确保返回非null的worker实例
    }else return streamingWorker;
  },
  terminateStreamingWorker: () => {
    const streamingWorker = get().streamingWorker;
    if (streamingWorker) {
      streamingWorker.terminate();
      set({ streamingWorker: null });
    }
  },
  tasksProcessingMap: new Map<string, TaskInfo>(),
  send: (taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => {
    const streamingWorker = get().confirmWorkerInitialized();
    streamingWorker.postMessage({
      type: "send",
      id: taskId,
      messages,
      apiBaseUrl
    });
    streamingWorker.onmessage = (event: MessageEvent<StreamMessageResponse>) => {
      if (event.data.id !== taskId) return; // 确保消息对应当前任务

    }
  },
  cancel: (taskId: string) => {
    set((state) => {
      const tasksProcessingMap = new Map(state.tasksProcessingMap);
      const task = tasksProcessingMap.get(taskId);
      if (task) {
        if(!state.streamingWorker)return { tasksProcessingMap }; // worker未初始化，无需发送取消消息
        state.streamingWorker.postMessage({
          type: "cancel",
          id: taskId,
        });
        tasksProcessingMap.delete(taskId);
      }
      return { tasksProcessingMap };
    });
  },
  offline: (taskId: string) => {
    set((state) => {
      const tasksProcessingMap = new Map(state.tasksProcessingMap);
      const task = tasksProcessingMap.get(taskId);
      if (task) {
        if(!state.streamingWorker)return { tasksProcessingMap }; // worker未初始化，无需发送离线消息
        state.streamingWorker.postMessage({
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
}));