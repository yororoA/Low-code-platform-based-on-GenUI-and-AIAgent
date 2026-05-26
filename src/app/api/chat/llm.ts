import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

// ======================== Model Provider ========================
function getModelProvider(): string {
  return process.env.GENUI_MODEL_PROVIDER || "openai";
}

function getApiKey(): string {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GENUI_API_KEY ||
    ""
  );
}

function getBaseUrl(): string | undefined {
  return process.env.OPENAI_BASE_URL || process.env.GENUI_BASE_URL || undefined;
}

// ======================== Model Factory ========================
export function createChatModel(options?: {
  temperature?: number;
  modelName?: string;
}): BaseChatModel {
  const provider = getModelProvider();
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const temperature = options?.temperature ?? 0.7;

  const modelName = options?.modelName || defaultModelMap[provider] || "gpt-4o";

  // All providers use OpenAI-compatible API via ChatOpenAI
  // This supports OpenAI, DeepSeek, Qwen, ZAI, MiniMax, etc.
  const resolvedBaseUrl = baseUrl || providerBaseUrlMap[provider] || undefined;

  return new ChatOpenAI({
    modelName,
    temperature,
    openAIApiKey: apiKey,
    configuration: resolvedBaseUrl
      ? { baseURL: resolvedBaseUrl }
      : undefined,
  });
}

// ======================== Dynamic Config Model Factory ========================
export interface LLMConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  modelName?: string;
  temperature?: number;
}

const defaultModelMap: Record<string, string> = {
  openai: "gpt-4o",
  "openai-responses": "gpt-4o",
  google: "gemini-2.0-flash",
  anthropic: "claude-sonnet-4-20250514",
  zai: "glm-4-plus",
  qwen: "qwen-max",
  deepseek: "deepseek-chat",
  minimax: "minimax-01",
};

const providerBaseUrlMap: Record<string, string> = {
  deepseek: "https://api.deepseek.com",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  zai: "https://open.bigmodel.cn/api/paas/v4",
  minimax: "https://api.minimax.chat/v1",
};

export function createChatModelFromConfig(config: LLMConfig): BaseChatModel {
  const provider = config.provider || "openai";
  const apiKey = config.apiKey;
  const temperature = config.temperature ?? 0.7;
  const modelName = config.modelName || defaultModelMap[provider] || "gpt-4o";
  const resolvedBaseUrl = config.baseUrl || providerBaseUrlMap[provider] || undefined;

  return new ChatOpenAI({
    modelName,
    temperature,
    openAIApiKey: apiKey,
    configuration: resolvedBaseUrl
      ? { baseURL: resolvedBaseUrl }
      : undefined,
  });
}

// ======================== Structured Output Model ========================
export function createStructuredModel<T extends Record<string, unknown>>(
  schema: import("zod").ZodType<T>,
  options?: { modelName?: string; temperature?: number },
) {
  return createChatModel(options).withStructuredOutput(schema);
}

export function createStructuredModelFromConfig<T extends Record<string, unknown>>(
  schema: import("zod").ZodType<T>,
  config: LLMConfig,
) {
  return createChatModelFromConfig(config).withStructuredOutput(schema);
}

// ======================== Streaming Model ========================
export function createStreamingModel(options?: {
  temperature?: number;
  modelName?: string;
}) {
  return createChatModel(options);
}

export function createStreamingModelFromConfig(config: LLMConfig) {
  return createChatModelFromConfig(config);
}

// ======================== Helper: Create model from state config or env ========================
export function createModelFromState(
  llmConfig: LLMConfig | null | undefined,
  options?: { temperature?: number; modelName?: string },
) {
  if (llmConfig?.apiKey) {
    return createChatModelFromConfig({ ...llmConfig, ...options });
  }
  return createChatModel(options);
}

export function createStructuredModelFromState<T extends Record<string, unknown>>(
  schema: import("zod").ZodType<T>,
  llmConfig: LLMConfig | null | undefined,
  options?: { temperature?: number; modelName?: string },
) {
  if (llmConfig?.apiKey) {
    return createStructuredModelFromConfig(schema, { ...llmConfig, ...options });
  }
  return createStructuredModel(schema, options);
}
