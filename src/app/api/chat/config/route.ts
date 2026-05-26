import { createChatModelFromConfig, type LLMConfig } from "../llm";

// In-memory store for config (keyed by client ID)
const configStore = new Map<string, { provider: string; baseUrl?: string; modelName?: string }>();

// GET: Returns current config (never returns API key)
export async function GET(req: Request) {
  const clientId = req.headers.get("X-Client-ID");
  if (!clientId) {
    return Response.json({ provider: null, baseUrl: null, modelName: null });
  }
  const config = configStore.get(clientId);
  if (!config) {
    return Response.json({ provider: null, baseUrl: null, modelName: null });
  }
  return Response.json(config);
}

// POST: Save config (provider, baseUrl, modelName) — API key is NOT stored here
export async function POST(req: Request) {
  const body = await req.json() as {
    clientId: string;
    provider: string;
    baseUrl?: string;
    modelName?: string;
  };

  if (!body.clientId) {
    return Response.json({ error: "clientId is required" }, { status: 400 });
  }

  const config = {
    provider: body.provider || "openai",
    baseUrl: body.baseUrl || undefined,
    modelName: body.modelName || undefined,
  };

  configStore.set(body.clientId, config);
  return Response.json({ success: true });
}

// Test connection endpoint
export async function PUT(req: Request) {
  const body = await req.json() as {
    provider: string;
    apiKey: string;
    baseUrl?: string;
    modelName?: string;
  };

  if (!body.apiKey) {
    return Response.json({ success: false, error: "API Key is required" }, { status: 400 });
  }

  try {
    const config: LLMConfig = {
      provider: body.provider,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      modelName: body.modelName,
      temperature: 0,
    };

    const model = createChatModelFromConfig(config);
    await model.invoke([{ role: "user", content: "Hi" }], { timeout: 10000 });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    });
  }
}
