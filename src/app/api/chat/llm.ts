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
  const resolvedBaseUrl = baseUrl || providerBaseUrlMap[provider] || undefined;

  return new ChatOpenAI({
    modelName,
    temperature,
    configuration: {
      ...(apiKey ? { apiKey } : {}),
      ...(resolvedBaseUrl ? { baseURL: resolvedBaseUrl } : {}),
    },
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

  // apiKey must be passed inside configuration to ensure the underlying
  // OpenAI client receives it — openAIApiKey alone is not merged into
  // the configuration object by @langchain/openai.
  return new ChatOpenAI({
    modelName,
    temperature,
    configuration: {
      apiKey,
      ...(resolvedBaseUrl ? { baseURL: resolvedBaseUrl } : {}),
    },
  });
}

// ======================== Structured Output Model ========================
// NOTE: withStructuredOutput only supports Zod v1/v2. Since this project uses
// Zod v4, we implement structured output manually by prompting the LLM to
// return JSON and validating with the provided Zod schema.

export interface StructuredModelLike {
  invoke(messages: unknown[]): Promise<unknown>;
}

function generateSchemaDescription(schema: import("zod").ZodType<unknown>): string {
  try {
    const def = (schema as unknown as Record<string, unknown>)._def || (schema as unknown as Record<string, unknown>).source;
    if (def) {
      return JSON.stringify(def, null, 2);
    }
  } catch {
    // fallback: use schema description
  }
  try {
    return (schema as unknown as Record<string, unknown>).description as string || "";
  } catch {
    return "";
  }
}

function extractJsonFromContent(content: string): string | null {
  const trimmed = content.trim();

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return trimmed.slice(jsonStart, jsonEnd + 1);
  }

  return null;
}

function buildStructuredModel(
  rawModel: ReturnType<typeof createChatModel>,
  schema: import("zod").ZodType<unknown>,
): StructuredModelLike {
  const schemaDesc = generateSchemaDescription(schema);
  const schemaHint = schemaDesc
    ? `\n\nThe expected JSON schema is:\n${schemaDesc}`
    : "";

  const jsonInstructions = `\n\nIMPORTANT: You MUST respond with a single valid JSON object. Do NOT include any text before or after the JSON. Do NOT wrap the JSON in markdown code blocks. Just output raw JSON.${schemaHint}`;

  return {
    async invoke(messages: unknown[]) {
      const augmented = [...(messages as import("@langchain/core/messages").BaseMessage[])];
      const lastIdx = augmented.length - 1;
      if (lastIdx >= 0) {
        const last = augmented[lastIdx];
        const content = typeof last.content === "string" ? last.content : JSON.stringify(last.content);
        const HumanMessage = (await import("@langchain/core/messages")).HumanMessage;
        augmented[lastIdx] = new HumanMessage(content + jsonInstructions);
      }

      const response = await rawModel.invoke(augmented);
      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      const jsonStr = extractJsonFromContent(content);
      if (!jsonStr) {
        const parsed = { _rawResponse: content };
        try {
          return schema.parse(parsed);
        } catch {
          return parsed;
        }
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = { _rawResponse: content, _rawJson: jsonStr };
      }

      try {
        return schema.parse(parsed);
      } catch {
        return parsed;
      }
    },
  };
}

export function createStructuredModel<T extends Record<string, unknown>>(
  schema: import("zod").ZodType<T>,
  options?: { modelName?: string; temperature?: number },
) {
  return buildStructuredModel(createChatModel(options), schema);
}

export function createStructuredModelFromConfig<T extends Record<string, unknown>>(
  schema: import("zod").ZodType<T>,
  config: LLMConfig,
) {
  return buildStructuredModel(createChatModelFromConfig(config), schema);
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
): StructuredModelLike {
  if (llmConfig?.apiKey) {
    return createStructuredModelFromConfig(schema, { ...llmConfig, ...options });
  }
  return createStructuredModel(schema, options);
}
