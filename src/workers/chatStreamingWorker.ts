import { AdminAgentMessage } from "@/app/api/chat/model";
import * as z from "zod";
import {generateHexId} from "@/lib/utils";

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

const chunkSchemaInfo_TYPESCHEMA = z.object({
  type: z.enum(["outputSchema", "tool-input", "pure-text"]),
  status: z.enum(['WAITING_FOR_KEY', 'READING_KEY', 'WAITING_FOR_COLON', 'READING_VALUE'])
    .describe('WAITING_FOR_KEY: 等待 key, READING_KEY: 读取 key, WAITING_FOR_COLON: 等待冒号, READING_VALUE: 读取 value'),
  key_value: z.array(z.object({
    keyBuffer: z.string().describe('用于拼接键名'),
    valueBuffer: z.string().describe('用于拼接键值'),
  })),
  finalData: z.object({
    id: z.string(),
    type: z.enum(['tool-input-start', 'tool-input-delta', 'tool-input-available', 'text']),
    text: z.string().optional().describe('非键值对形式的纯文本text'),
    output: z.object().optional().describe('以键值对形式存在的text'),
    toolCallId: z.string().optional().describe('tool call id'),
    toolName: z.string().optional().describe('tool name'),
    input: z.object().optional().describe('tool input')
  }),
  // 状态机追踪
  _inString: z.boolean().optional().describe('当前是否正处于被双引号包裹的字符串内部'),
  _nestingDepth: z.number().optional().describe('括号嵌套深度'),
  _escapeNext: z.boolean().optional().describe('是否遇到转义符 \\'),
  _done: z.boolean().describe('是否解析完成'),
});
const stageInfo_TYPESCHEMA = z.object({
  id: z.string(),
  stage: z.string().describe('stage name'),
  message: z.string().describe('message'),
});
type chunkSchemaInfo = z.infer<typeof chunkSchemaInfo_TYPESCHEMA>;
type stageInfo = z.infer<typeof stageInfo_TYPESCHEMA>;
type classifiedParsedChunkInfo = {
  type: 'tool^schema' | 'stageInfo',
  infos: chunkSchemaInfo | stageInfo,
};

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
    let chunkSchemaCached: chunkSchemaInfo | null = null;

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
                console.log(chunk);
                const parsedChunk__Typed = parse_classifyChunk(chunk, chunkSchemaCached);
                if (!parsedChunk__Typed) continue;
                else {
                  // stageInfo 在服务端为直接 write 写入, 初始即为 done 状态, 解析出后可直接抛出
                  if (parsedChunk__Typed.type === 'stageInfo') {
                    const state = parsedChunk__Typed.infos as stageInfo;
                    parsedMessages.push({
                      id: chunk.id,
                      role: 'assistant',
                      parts: [{ type: 'text', text: `[${state.stage}] ${state.message}` }],
                    } as AdminAgentMessage);
                  } else {
                    // 非 stageInfo 需要经过流拼接 并显式识别到 done 后才能抛出
                    const state = parsedChunk__Typed.infos as chunkSchemaInfo;
                    if (!state._done) {
                      // 非 done 覆盖更新缓存, 检测是否已有可抛出的 finalData
                      // todo: 根据 id 推入或者更新 parsedMessages 中对应缓存
                      chunkSchemaCached = state; // 仅当状态机未完成时才更新缓存，避免已完成的状态被后续不相关的chunk覆盖
                    }
                    else { // todo: 根据 id 更新 parsedMessages 中对应缓存
                      // 检测到 done 时对 finalData 进行处理后抛出
                      chunkSchemaCached = null; // 状态机重置缓存
                      if (state.type === 'outputSchema') {
                        
                      } else {

                      }
                    }
                  }
                }
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
 * output-schema 以及 tool-input-delta 的共享流式 JSON 状态机
 * @param chunk - 当前的消息块
 * @param chunkSchemaCached - 上一轮的解析缓存
 */
function processJSONFSM(state: chunkSchemaInfo, data: string): chunkSchemaInfo {
  const isToolInput = state.type === 'tool-input';
  if (isToolInput && state.finalData.type === 'tool-input-start') state.finalData.type = 'tool-input-delta'; // tool-input 从 start 进入 delta 状态
  // todo: 目前只解析了键值对形式的JSON输出, 应当添加对纯文本形式的解析
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
        // 处理 key 两侧的 \ , 如 \text\   \topic\, 当 escapeNext===true 时代表上轮 char 为 \ 且该轮 char 为 key部分
        currentTarget.keyBuffer += char;
        state._escapeNext = false;
      } else if (char === '\\') state._escapeNext = true; // 标记 escapeNext 以供下轮使用
      else if (char === '"') state.status = "WAITING_FOR_COLON"; // key 闭合, 等待冒号
      else currentTarget.keyBuffer += char; // key 内容
      continue;
    }
    // 3. 等冒号
    if (state.status === "WAITING_FOR_COLON") {
      if (char === ':') {
        state.status = 'READING_VALUE';
        if (isToolInput) state.finalData.input[currentTarget.keyBuffer] = ''; // 预先占位，方便前端增量展示
        else state.finalData.output[currentTarget.keyBuffer] = ''; // 预先占位，方便前端增量展示
        state._inString = false;
        state._nestingDepth = 0;
      }
      continue;
    }
    // 4. 读 value
    if (state.status === "READING_VALUE") {
      if (state._escapeNext) {
        // 同上 key 处理, 当标记为true时该轮char为value内容的开始
        currentTarget.valueBuffer += char;
        if (isToolInput) state.finalData.input[currentTarget.keyBuffer] = currentTarget.valueBuffer;
        else state.finalData.output[currentTarget.keyBuffer] = currentTarget.valueBuffer;
        state._escapeNext = false;
        continue;
      }
      if (char === '\\') {
        // 标记下轮char为value内容的开始
        currentTarget.valueBuffer += char;
        if (isToolInput) state.finalData.input[currentTarget.keyBuffer] = currentTarget.valueBuffer;
        else state.finalData.output[currentTarget.keyBuffer] = currentTarget.valueBuffer;
        state._escapeNext = true;
        continue;
      }
      // 引号切换字符串内外状态
      if (char === '"') {
        state._inString = !state._inString;
        currentTarget.valueBuffer += char;
        if (isToolInput) state.finalData.input[currentTarget.keyBuffer] = currentTarget.valueBuffer;
        else state.finalData.output[currentTarget.keyBuffer] = currentTarget.valueBuffer;
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
        // 根边界 json 闭合， 整轮 json 结束
        if (state._nestingDepth! < 0 && char === '}') {
          state._done = true;
          if (isToolInput) state.finalData.type = 'tool-input-available'; // tool-input 从 delta 进入 available 状态
          continue;
        }
        if (currentTarget.valueBuffer === '' && char.trim() === '') continue;
      }
      currentTarget.valueBuffer += char;
      if (isToolInput) state.finalData.input[currentTarget.keyBuffer] = currentTarget.valueBuffer;
      else state.finalData.output[currentTarget.keyBuffer] = currentTarget.valueBuffer;
    }
  }
  return state;
}

/**
 * 解析chunk中存在的outputSchema|tool-input的delta
 * @param chunk - 当前的消息块
 * @param chunkSchemaCached - 上一轮的解析缓存
 */
function parseChunkForSchemaInfo(
  chunk: object & {
    type?: string,
    id?: string,
    delta?: string,
    inputTextDelta?: string,
    toolCallId?: string,
    toolName?: string,
  }, chunkSchemaCached: chunkSchemaInfo | null = null
): chunkSchemaInfo | stageInfo | null {
  const { type, ...rest } = chunk;
  const inStage = rest.id?.includes("stage-info") || rest.id?.includes("alignment-info");
  // 初始化 output-schema 对应的 JSON-FSM 状态机
  if (type === 'text-start') {
    if (inStage) return null;
    else return {
      type: 'outputSchema',
      status: 'WAITING_FOR_KEY',
      key_value: [],
      finalData: {
        id: generateHexId(),
        type: 'text',
        text: '',
        output: {},
      },
      _inString: false,
      _nestingDepth: 0,
      _escapeNext: false,
      _done: false,
    }
  }
  if (type === 'text-delta') {
    if (inStage) {
      // stageInfo
      const reg = /\[([^\]]*)\]/g;
      const stage = rest.delta?.match(reg)?.[0]?.slice(1, -1) || '';
      const message = rest.delta?.replace(reg, '').trim() || '';
      return { stage, message, id:rest.id } as stageInfo;
    } else {
      // output-schema 状态机解析
      const data = rest.delta as string;
      if (!chunkSchemaCached || chunkSchemaCached.type !== 'outputSchema') return null;
      return processJSONFSM(chunkSchemaCached, data);
    }
  } else if (type?.includes('tool-input')) {
    if (type === 'tool-input-start') return {
      // 初始化 tool-input-delta 对应的 JSON-FSM 状态机
      type: 'tool-input',
      status: 'WAITING_FOR_KEY',
      key_value: [],
      finalData: {
        id: generateHexId(),
        type,
        toolCallId: rest.toolCallId,
        toolName: rest.toolName,
        input: {},
      },
      _inString: false,
      _nestingDepth: 0,
      _escapeNext: false,
      _done: false,
    }; else if (type === 'tool-input-delta') {
      const data = rest.inputTextDelta as string;
      if (!chunkSchemaCached || chunkSchemaCached.type !== 'tool-input') return null;
      return processJSONFSM(chunkSchemaCached, data);
    }
  }
  return null;
}

/**
 * 解析并分类 chunk 类型，区分出 outputSchema、tool-input 以及 stageInfo 三种特殊类型的 chunk
 * @param chunk - 当前的消息块
 * @param chunkSchemaCached - 上一轮的解析缓存
 */
function parse_classifyChunk(chunk: unknown, chunkSchemaCached: chunkSchemaInfo | null): classifiedParsedChunkInfo | null {
  if (typeof chunk !== 'object' || chunk === null) return null;
  const parsedChunk_info = parseChunkForSchemaInfo(chunk as object, chunkSchemaCached);
  if (!parsedChunk_info) return null;
  if (stageInfo_TYPESCHEMA.safeParse(parsedChunk_info).success) return {
    type: 'stageInfo',
    infos: parsedChunk_info as stageInfo,
  }; else return {
    type: 'tool^schema',
    infos: parsedChunk_info as chunkSchemaInfo,
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