import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { compileChatGraph, compileInteractionGraph, compileStyleEditGraph } from "./graph";
import { encodeSSE, stateToSSEEvents, finalStateToSSEEvents } from "./sse";
import type { SSEEvent } from "./sse";
import type { ChatGraphStateType } from "./state";
import type { LLMConfig } from "./llm";

export const maxDuration = 300;

// ======================== Helper: Convert frontend messages to LangChain messages ========================
function convertToLangChainMessages(messages: unknown[]): BaseMessage[] {
  const result: BaseMessage[] = [];
  for (const msg of messages as Array<{ role: string; parts?: Array<{ type: string; text?: string }>; content?: string }>) {
    const textContent = msg.parts
      ?.filter((p) => p.type === "text")
      .map((p) => p.text || "")
      .join("\n")
      || msg.content
      || "";

    if (msg.role === "user") {
      result.push(new HumanMessage(textContent));
    }
    // Skip assistant/system messages for input - the graph generates its own
  }
  return result;
}

// ======================== Helper: Extract LLM config from request headers ========================
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

// ======================== POST Handler ========================
export async function POST(req: Request) {
  const body = await req.json();
  const { messages, requestType, interactionPayload, styleEditPayload } = body as {
    messages: unknown[];
    requestType?: "chat" | "interaction" | "style-edit";
    interactionPayload?: { type: string; description: string; currentPageContext?: string };
    styleEditPayload?: { uiTreeSummary: string; currentStyles: string; editRequest: string };
  };

  const threadId = `thread_${Date.now()}`;
  const langchainMessages = convertToLangChainMessages(messages);

  // Select graph based on request type
  const resolvedRequestType = requestType || "chat";
  let compiledGraph: ReturnType<typeof compileChatGraph>;

  switch (resolvedRequestType) {
    case "interaction":
      compiledGraph = compileInteractionGraph() as ReturnType<typeof compileChatGraph>;
      break;
    case "style-edit":
      compiledGraph = compileStyleEditGraph() as ReturnType<typeof compileChatGraph>;
      break;
    default:
      compiledGraph = compileChatGraph();
  }

  // Build initial state
  const llmConfig = extractLlmConfigFromHeaders(req);
  const initialState: Partial<ChatGraphStateType> = {
    messages: langchainMessages,
    requestType: resolvedRequestType,
    interactionPayload: interactionPayload || null,
    styleEditPayload: styleEditPayload || null,
    llmConfig,
  };

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const sendEvent = (event: SSEEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encodeSSE(event));
        } catch {
          closed = true;
        }
      };

      // Heartbeat
      const heartbeatInterval = setInterval(() => {
        sendEvent({ event: "heartbeat", data: {} });
      }, 15000);

      try {
        // Stream graph execution
        const graphStream = await compiledGraph.stream(initialState, {
          configurable: { thread_id: threadId },
          streamMode: "updates",
        });

        for await (const update of graphStream) {
          if (closed) break;

          // update is { nodeName: partialState }
          for (const [nodeName, partialState] of Object.entries(update)) {
            if (closed) break;

            const events = stateToSSEEvents(
              nodeName,
              partialState as Partial<ChatGraphStateType>,
              threadId,
            );

            for (const event of events) {
              sendEvent(event);
            }
          }
        }

        // Get final state for done event
        const finalState = await compiledGraph.getState({
          configurable: { thread_id: threadId },
        });

        const doneEvents = finalStateToSSEEvents(
          finalState.values as ChatGraphStateType,
          threadId,
        );
        for (const event of doneEvents) {
          sendEvent(event);
        }
      } catch (error) {
        sendEvent({
          event: "error",
          data: { message: error instanceof Error ? error.message : "An unexpected error occurred" },
        });
        sendEvent({ event: "done", data: { threadId } });
      } finally {
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // already closed
        }
        closed = true;
      }
    },
    cancel() {
      // Stream cancelled by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
