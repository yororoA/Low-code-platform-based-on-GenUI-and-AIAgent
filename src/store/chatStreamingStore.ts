import { create } from "zustand";
import { AdminAgentMessage } from "@/app/api/chat/model";
import { StreamMessageResponse } from "@/types";


class TaskInfo {
  isFocused: boolean = true;
  streamingWorker: Worker | null = null; // 流式处理 worker
  dedupMessageWorker: Worker | null = null; // 去重 worker
  // messagesBuffer 用于存储当前流式处理过程中解析出的消息， key为 taskId 用以去重和覆盖更新
  public messagesBuffer: AdminAgentMessage[] = [];
  constructor(public taskId: string) {
    this.isFocused = true;
    this.streamingWorker = null;
    this.dedupMessageWorker = null;
    this.messagesBuffer = [];
  }

  public initWorker: (type: "streaming" | "dedupMessage") => void = (type) => {
    if (type === "streaming") {
      this.streamingWorker = new Worker(new URL("@/workers/chatStreamingWorker.ts", import.meta.url));
    } else {
      this.dedupMessageWorker = new Worker(new URL("@/workers/chatMessagesDedupeWorker.ts", import.meta.url));
    }
  };
  public confirmWorkerInitialized: (type: "streaming" | "dedupMessage") => Worker = (type) => {
    if (type === 'streaming') {
      const streamingWorker = this.streamingWorker;
      if (!streamingWorker) {
        this.initWorker("streaming");
        return this.streamingWorker as Worker; // 确保返回非null的worker实例
      } else return streamingWorker;
    } else {
      const dedupMessageWorker = this.dedupMessageWorker;
      if (!dedupMessageWorker) {
        this.initWorker("dedupMessage");
        return this.dedupMessageWorker as Worker;
      } else return dedupMessageWorker;
    }
  };
  public terminateWorker: (type: "streaming" | "dedupMessage" | "all") => void = (type) => {
    if (type === "streaming") {
      this.streamingWorker?.terminate();
      this.streamingWorker = null;
    } else if (type === "dedupMessage") {
      this.dedupMessageWorker?.terminate();
      this.dedupMessageWorker = null;
    } else {
      this.streamingWorker?.terminate();
      this.streamingWorker = null;
      this.dedupMessageWorker?.terminate();
      this.dedupMessageWorker = null;
    }
  };
}

// todo: 将其他 worker 的相关管理也移入此 store
interface ChatStreamingState {
  workersAllowed: boolean;
  setWorkersAllowed: (workersAllowed: boolean) => void;
  tasksProcessingMap: Map<string, TaskInfo>;
  send: (taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => void;
  cancel: (taskId: string) => void;
  offline: (taskId: string) => void;
  online: () => void;
  terminateAllTasks: () => void;
}

export const useChatStreamingStore = create<ChatStreamingState>((set) => ({
  workersAllowed: false,
  setWorkersAllowed: (workersAllowed: boolean) => set({ workersAllowed }),
  tasksProcessingMap: new Map<string, TaskInfo>(),
  send: (taskId: string, messages: AdminAgentMessage[], apiBaseUrl: string) => {
    // 创建任务信息
    const task = new TaskInfo(taskId);
    set((state) => {
      const tasksProcessingMap = new Map(state.tasksProcessingMap);
      tasksProcessingMap.set(taskId, task);
      return { tasksProcessingMap };
    });
    const streamingWorker = task.confirmWorkerInitialized("streaming");
    const dedupMessageWorker = task.confirmWorkerInitialized("dedupMessage");
    // 发送消息给流式处理 worker
    streamingWorker.postMessage({
      type: "send",
      id: taskId,
      messages,
      apiBaseUrl
    });
    // 接收到流式处理 worker 的消息
    streamingWorker.onmessage = (event: MessageEvent<StreamMessageResponse>) => {
      if (event.data.id !== taskId) return; // 确保消息对应当前任务
      if (event.data.type === "message") {
        const messages = event.data.data as AdminAgentMessage[];
        // 发送消息给去重 worker
        dedupMessageWorker.postMessage(messages);
      } else if (event.data.type === "complete") {
        // 流式处理 worker 完成
        set((state) => {
          const tasksProcessingMap = new Map(state.tasksProcessingMap);
          const task = tasksProcessingMap.get(taskId);
          if (task) {
            task.terminateWorker('all');
            tasksProcessingMap.delete(taskId);
          }
          return { tasksProcessingMap };
        });
      } else {
        // 流式处理 worker 出错
        set((state) => {
          const tasksProcessingMap = new Map(state.tasksProcessingMap);
          const task = tasksProcessingMap.get(taskId);
          if (task) {
            task.terminateWorker('all');
            tasksProcessingMap.delete(taskId);
          }
          return { tasksProcessingMap };
        });
        throw new Error(event.data.error);
      }
    };
    // 接收到去重 worker 的消息
    dedupMessageWorker.onmessage = (event: MessageEvent<AdminAgentMessage[]>) => {
      const dedupedMessages = event.data as AdminAgentMessage[];
      set((state) => {
        const tasksProcessingMap = new Map(state.tasksProcessingMap);
        const task = tasksProcessingMap.get(taskId);
        if (task) {
          task.messagesBuffer = dedupedMessages;
        }
        return { tasksProcessingMap };
      });
    }
  },
  cancel: (taskId: string) => {
    set((state) => {
      const tasksProcessingMap = new Map(state.tasksProcessingMap);
      const task = tasksProcessingMap.get(taskId);
      if (task) {
        if (!task.streamingWorker) return { tasksProcessingMap }; // worker未初始化，无需发送取消消息
        task.streamingWorker.postMessage({
          type: "cancel",
          id: taskId,
        });
        task.terminateWorker('all');
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
        if (!task.streamingWorker) return { tasksProcessingMap }; // worker未初始化，无需发送离线消息
        task.streamingWorker.postMessage({
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
    set((state) => {
      const tasksProcessingMap = new Map(state.tasksProcessingMap);
      for (const task of tasksProcessingMap.values()) {
        task.terminateWorker('all');
      }
      return { tasksProcessingMap: new Map<string, TaskInfo>() };
    });
  }
}));