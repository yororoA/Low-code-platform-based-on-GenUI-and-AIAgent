import { HumanMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
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
    } else if (msg.role === "assistant" && textContent.trim()) {
      result.push(new AIMessage(textContent));
    }
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
  type CompiledGraphLike = {
    stream: (
      input: Partial<ChatGraphStateType>,
      options: unknown,
    ) => Promise<AsyncIterable<Record<string, Partial<ChatGraphStateType>>>>;
    streamEvents: (
      input: Partial<ChatGraphStateType>,
      options: unknown,
    ) => Promise<AsyncIterable<Record<string, unknown>>>;
    getState: (options: unknown) => Promise<{ values: ChatGraphStateType }>;
  };

  let compiledGraph: CompiledGraphLike;

  switch (resolvedRequestType) {
    case "interaction":
      compiledGraph = compileInteractionGraph() as unknown as CompiledGraphLike;
      break;
    case "style-edit":
      compiledGraph = compileStyleEditGraph() as unknown as CompiledGraphLike;
      break;
    default:
      compiledGraph = compileChatGraph() as unknown as CompiledGraphLike;
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
      let errorEmitted = false;

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
        sendEvent({ event: "heartbeat", data: {} as Record<string, never> });
      }, 15000);

      try {
        sendEvent({
          event: "stage_info",
          data: { stage: "ADMIN", message: "Thinking for response...", timestamp: Date.now() },
        });

        // Stream graph execution with parallel LLM progress events
        const graphStream = await compiledGraph.stream(initialState, {
          configurable: { thread_id: threadId },
          streamMode: "updates",
        });

        const eventsStream = await compiledGraph.streamEvents(initialState, {
          version: 2,
          configurable: { thread_id: threadId },
        });

        const NODE_LABELS: Record<string, string> = {
          admin: "ADMIN",
          structure: "STRUCTURE",
          alignment: "ALIGNMENT",
          style: "STYLE",
          interaction: "INTERACTION",
          style_edit: "STYLE_EDIT",
        };

        // Process LLM events in parallel (non-blocking)
        const eventsDone = (async () => {
          try {
            for await (const event of eventsStream) {
              if (closed) break;
              if (event.event === "on_chat_model_start") {
                const meta = (event.data as Record<string, unknown> | undefined) ?? {};
                const metadata = (meta.metadata ?? {}) as Record<string, unknown>;
                const graphNode = metadata.langgraph_node as string | undefined;
                const stageName = graphNode ? (NODE_LABELS[graphNode] ?? graphNode.toUpperCase()) : undefined;
                if (stageName) {
                  sendEvent({
                    event: "stage_info",
                    data: { stage: stageName, message: "正在调用模型思考中...", timestamp: Date.now() },
                  });
                }
              }
            }
          } catch {
            // streamEvents errors are non-fatal, main stream handles errors
          }
        })();

        for await (const update of graphStream) {
          if (closed) break;

          for (const [nodeName, partialState] of Object.entries(update)) {
            if (closed) break;

            const events = stateToSSEEvents(
              nodeName,
              partialState as Partial<ChatGraphStateType>,
            );

            for (const event of events) {
              if (event.event === "error") {
                if (errorEmitted) continue;
                errorEmitted = true;
              }
              sendEvent(event);
            }
          }
        }

        // Wait for events stream to finish
        await eventsDone.catch(() => undefined);

        // Get final state for done event
        const finalState = await compiledGraph.getState({
          configurable: { thread_id: threadId },
        });

        const doneEvents = finalStateToSSEEvents(
          finalState.values as ChatGraphStateType,
          threadId,
        );
        for (const event of doneEvents) {
          if (event.event === "error") {
            if (errorEmitted) continue;
            errorEmitted = true;
          }
          sendEvent(event);
        }
      } catch (error) {
        if (!errorEmitted) {
          sendEvent({
            event: "error",
            data: { message: error instanceof Error ? error.message : "An unexpected error occurred" },
          });
        }
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
