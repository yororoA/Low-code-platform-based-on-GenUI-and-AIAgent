import { compileInteractionGraph } from "../graph";
import type { InteractionRequestPayload, InteractionResponsePayload } from "@/types/interaction";
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
  const body: InteractionRequestPayload = await req.json();
  const llmConfig = extractLlmConfigFromHeaders(req);

  const threadId = `interaction_${Date.now()}`;
  const graph = compileInteractionGraph();

  const initialState: Partial<ChatGraphStateType> = {
    messages: [new HumanMessage(body.contentDescription ?? body.description ?? body.onSubmitDescription ?? "")],
    requestType: "interaction",
    interactionPayload: {
      type: body.type,
      description: body.contentDescription ?? body.description ?? body.onSubmitDescription ?? "",
      currentPageContext: body.currentPageContext,
    },
    styleEditPayload: null,
    llmConfig,
  };

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    }) as ChatGraphStateType;

    const interactionOutput = result.interactionOutput;
    if (!interactionOutput?.uiTree) {
      return Response.json(
        { error: "Interaction agent failed to generate UI tree" },
        { status: 500 },
      );
    }

    const currentUiTree = typeof interactionOutput.uiTree === "string"
      ? interactionOutput.uiTree
      : JSON.stringify(interactionOutput.uiTree);

    const styles = result.styleOutput?.styles ?? [];

    const response: InteractionResponsePayload = {
      uiTree: currentUiTree,
      styles,
      interactions: interactionOutput.interactions,
      pages: interactionOutput.pages,
    };

    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: `Interaction agent failed: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 500 },
    );
  }
}
