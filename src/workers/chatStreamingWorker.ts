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

type chunkSchemaInfo = {
  type: "outputSchema" | "tool-input";
  status: 'WAITING_FOR_KEY'
  | 'READING_KEY' // 拼接键名
  | 'WAITING_FOR_COLON' // 键名闭合，等待冒号
  | 'READING_VALUE' // 冒号之后读取对应值, 值结束后根据解析结果决定是否继续解析下一个键值对
  readCache?: string;
  key_value: {
    keyBuffer: string; // 用于拼接键名
    valueBuffer: string; // 用于拼接键值
  }[];
  // 状态机追踪
  _inString?: boolean; // 当前是否正处于被双引号包裹的字符串内部
  _nestingDepth?: number; // 括号嵌套深度
  _escapeNext?: boolean; // 是否遇到转义符 \
}
type stageInfo = {
  stage: string;
  message: string;
}

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
      // console.log(buffer)

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
                console.log("Parsed chunk:", chunk);
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
 * 解析chunk中存在的outputSchema|tool-input的delta
 */
function parseChunkForSchemaInfo(
  chunk: object & {
    type?: string,
    id?: string,
    delta?: string,
    inputTextDelta?: string,
  }, chunkSchemaCached?: chunkSchemaInfo
): chunkSchemaInfo | stageInfo | null {
  const { type, ...rest } = chunk;
  let dataType: 'schema' | 'tool-input' | null = null;
  if (type === 'text-delta') {
    if (rest.id?.includes("stage-info") || rest.id?.includes("alignment-info")) {
      // stageInfo
      const reg = /\[([^\]]*)\]/g;
      const stage = rest.delta?.match(reg)?.[0]?.slice(1, -1) || '';
      const message = rest.delta?.replace(reg, '').trim() || '';
      return {
        stage,
        message,
      } as stageInfo;
    } else dataType = 'schema';
  } else if (type?.includes('tool-input')) {
    if (type === 'tool-input-start') return {
      type: 'tool-input',
      status: 'WAITING_FOR_KEY',
      key_value: [],
      _inString: false,
      _nestingDepth: 0,
      _escapeNext: false,
    }; else if (type === 'tool-input-delta') {
      const data = rest.inputTextDelta as string;
      if (!chunkSchemaCached) return null;
      const state = chunkSchemaCached;
      for (let i = 0; i < data.length; i++) {
        const char = data[i];

        // 1. 寻 key
        if (state.status === 'WAITING_FOR_KEY') {
          if (char === '"') {
            state.status = "READING_KEY";
            state.key_value.push({ keyBuffer: '', valueBuffer: '' });
          }
          continue; // 忽略遇到首个双引号之前的 空格/逗号/{ 等
        }
        const currentTarget = state.key_value.at(-1) as { keyBuffer: string, valueBuffer: string };
        // 2. 读 key
        if (state.status === "READING_KEY") {
          if (state._escapeNext) {
            currentTarget.keyBuffer += char;
            state._escapeNext = false;
          } else if (char === '\\') state._escapeNext = true;
          else if (char === '"') state.status = "WAITING_FOR_COLON";
          else currentTarget.keyBuffer += char;
          continue;
        }
        // 3. 等冒号
        if (state.status === "WAITING_FOR_COLON") {
          if (char === ':') {
            state.status = 'READING_VALUE';
            state._inString = false;
            state._nestingDepth = 0;
          }
          continue;
        }
        // 4. 读 value
        if (state.status === "READING_VALUE") {
          if (state._escapeNext) {
            currentTarget.valueBuffer += char;
            state._escapeNext = false;
            continue;
          }
          if (char === '\\') {
            currentTarget.valueBuffer += char;
            state._escapeNext = true;
            continue;
          }
          // 引号切换字符串内外状态
          if (char === '"') {
            state._inString = !state._inString;
            currentTarget.valueBuffer += char;
            continue;
          }
          // 不在字符串内部追踪括号深度
          if (!state._inString) {
            if (char === '{' || '[') state._nestingDepth!++;
            else if (char === '}' || ']') state._nestingDepth!--;
            // 边界深度 0 且逗号则结束当前 value
            if (state._nestingDepth === 0 && char === ',') {
              state.status = 'WAITING_FOR_KEY';
              continue; // 丢弃逗号， 等待下一轮 key_value
            }
            // 根边界 json 闭合， 整轮 tool-input 结束
            if(state._nestingDepth! < 0 && char === '}')continue;
          }
          currentTarget.valueBuffer += char;
        }
      }
      return state;
    }
  }


  return null;
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