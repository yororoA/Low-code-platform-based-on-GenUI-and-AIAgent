export const STORAGE_KEY = "genui-llm-config";

export function getLlmConfigHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored) as {
        provider?: string;
        apiKey?: string;
        baseUrl?: string;
        modelName?: string;
      };
      if (config.provider) headers["X-LLM-Provider"] = config.provider;
      if (config.apiKey) headers["X-LLM-Api-Key"] = config.apiKey;
      if (config.baseUrl) headers["X-LLM-Base-Url"] = config.baseUrl;
      if (config.modelName) headers["X-LLM-Model"] = config.modelName;
    }
  } catch {
    // ignore
  }
  return headers;
}
