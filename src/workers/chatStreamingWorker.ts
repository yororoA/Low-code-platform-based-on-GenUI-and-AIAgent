import { AdminAgentMessage } from "@/app/api/chat/model";

type StreamMessageEvent = {
  type: "send";
  id: string;
  messages: AdminAgentMessage[];
  apiBaseUrl?: string;
  signal?: AbortSignal;
} | {
  type: "cancel";
  id: string;
};

type StreamMessageResponse = {
  type: "message" | "error" | "complete";
  id: string;
  data?: AdminAgentMessage[];
  error?: string;
};

const TaskRegistry = new Map<string, {
  controller: AbortController;
  buffer: string;
  isFocused: boolean;
  messageBuffer: AdminAgentMessage[];
}>();

/**
 * 手动解析 UI 消息流，替代 useChat 的 sendMessage
 * @param messages - 消息数组
 * @param signal - 可选的 AbortSignal
 * @returns 异步迭代器，每次产生一条消息
 */
async function* parseUIMessageStream(
  messages: AdminAgentMessage[],
  apiBaseUrl?: string,
  signal?: AbortSignal
): AsyncGenerator<AdminAgentMessage[], void, unknown> {
  const controller = signal ? new AbortController() : new AbortController();
  const apiUrl = (() => {
    if (apiBaseUrl) return new URL("/api/chat", apiBaseUrl).toString();
    return new URL("/api/chat", self.location.href).toString();
  })();
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
      signal: signal || controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const parsedMessages: AdminAgentMessage[] = [];

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // 处理最后剩余的数据
        if (buffer.trim()) {
          const chunk = parseServerSentEvent(buffer);
          if (chunk) {
            parsedMessages.push(chunk);
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      console.log(buffer)
      
      // 按行分割处理 SSE 格式数据
      const lines = buffer.split("\n");
      buffer = lines[lines.length - 1]; // 保留最后不完整的行

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        
        if (line.startsWith("data:")) {
          try {
            const jsonStr = line.slice(5).trim();
            if (jsonStr) {
              const chunk = JSON.parse(jsonStr);
              if (chunk) {
                parsedMessages.push(chunk);
                // 可以在这里定期 yield，而不是等到全部完成
                if (parsedMessages.length >= 1) {
                  yield [...parsedMessages];
                  parsedMessages.length = 0;
                }
              }
            }
          } catch (parseErr) {
            console.warn("Failed to parse SSE data:", parseErr);
          }
        }
      }
    }

    // 最后产生剩余的消息
    if (parsedMessages.length > 0) {
      yield parsedMessages;
    }
  } finally {
    controller.abort();
  }
}

/**
 * 解析单个 SSE 事件
 */
function parseServerSentEvent(eventStr: string): AdminAgentMessage | null {
  const lines = eventStr.split("\n");
  let data = "";

  for (const line of lines) {
    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 处理来自主线程的消息
 */
onmessage = async (event: MessageEvent<StreamMessageEvent>) => {
  const { type, id } = event.data;

  if (type === "send") {
    const { messages, apiBaseUrl, signal } = event.data;
    const controller = new AbortController();

    TaskRegistry.set(id, {
      controller,
      buffer: "",
      isFocused: true,
      messageBuffer: [],
    });

    try {
      for await (const chunk of parseUIMessageStream(messages, apiBaseUrl, signal)) {
        const task = TaskRegistry.get(id);
        if (!task) break;

        task.messageBuffer.push(...chunk);

        // 将消息发送回主线程
        self.postMessage({
          type: "message",
          id,
          data: task.messageBuffer,
        } as StreamMessageResponse);
      }

      // 流处理完成
      self.postMessage({
        type: "complete",
        id,
        data: TaskRegistry.get(id)?.messageBuffer || [],
      } as StreamMessageResponse);

      TaskRegistry.delete(id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      self.postMessage({
        type: "error",
        id,
        error: errorMsg,
      } as StreamMessageResponse);

      TaskRegistry.delete(id);
    }
  } else if (type === "cancel") {
    const task = TaskRegistry.get(id);
    if (task) {
      task.controller.abort();
      TaskRegistry.delete(id);
    }
  }
};