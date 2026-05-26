import { compileStyleEditGraph } from "../graph";
import type { ChatGraphStateType } from "../state";
import type { LLMConfig } from "../llm";
import { HumanMessage } from "@langchain/core/messages";

function extractLlmConfigFromHeaders(req: Request): LLMConfig | null {
  const provider = req.headers.get("X-LLM-Provider");
  const apiKey = req.headers.get("X-LLM-Api-Key");
  const baseUrl = req.headers.get("X-LLM-Base-Url");
  const model = req.headers.get("X-LLM-Model");

  if (!provider && !apiKey) return null;

  return {
    provider: provider || "openai",
    apiKey: apiKey || "",
    baseUrl: baseUrl || undefined,
    modelName: model || undefined,
  };
}

export async function POST(req: Request) {
  const body = await req.json() as {
    uiTreeSummary: string
    currentStyles: string
    editRequest: string
  };

  const llmConfig = extractLlmConfigFromHeaders(req);
  const threadId = `style_edit_${Date.now()}`;
  const graph = compileStyleEditGraph();

  const initialState: Partial<ChatGraphStateType> = {
    messages: [new HumanMessage(body.editRequest)],
    requestType: "style-edit",
    interactionPayload: null,
    styleEditPayload: {
      uiTreeSummary: body.uiTreeSummary,
      currentStyles: body.currentStyles,
      editRequest: body.editRequest,
    },
    llmConfig,
  };

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    }) as ChatGraphStateType;

    const editOutput = result.styleEditOutput;
    if (!editOutput?.styleEdits) {
      return Response.json(
        { error: "Style edit agent failed to produce edits" },
        { status: 500 },
      );
    }

    return Response.json({ styleEdits: editOutput.styleEdits });
  } catch (error) {
    return Response.json(
      { error: `Style edit agent failed: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 500 },
    );
  }
}
