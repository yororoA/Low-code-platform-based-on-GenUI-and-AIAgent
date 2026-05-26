import { type WorkflowRunPayload, type WorkflowNodeType } from "@/types";
import { compileWorkflowGraph } from "./graph";
import { type WorkflowGraphStateType } from "@/app/api/chat/state";
import { type LLMConfig } from "@/app/api/chat/llm";
import { encodeSSE, type SSEEvent } from "@/app/api/chat/sse";

function normalizeNodeType(type: WorkflowNodeType): Exclude<WorkflowNodeType, "condition"> {
  return type === "condition" ? "branch" : type;
}

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
  const payload: WorkflowRunPayload = await req.json();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
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
        // Validate input node exists
        const inputNode = payload.nodes.find(
          (n) => normalizeNodeType(n.type) === "input",
        );
        if (!inputNode) {
          sendEvent({ event: "error", data: { message: "未找到输入节点" } });
          sendEvent({ event: "done", data: { threadId: "" } });
          controller.close();
          closed = true;
          clearInterval(heartbeatInterval);
          return;
        }

        // Build and compile the workflow graph
        const compiledGraph = compileWorkflowGraph(payload);
        const threadId = `workflow_${Date.now()}`;

        // Build initial state
        const llmConfig = extractLlmConfigFromHeaders(req);
        const initialState: Partial<WorkflowGraphStateType> = {
          accumulatedContext: "",
          nodeOutputs: {},
          focusedNodeId: null,
          stageInfo: [],
          error: null,
          llmConfig,
        };

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

            const state = partialState as Partial<WorkflowGraphStateType>;

            // Send node_start event
            sendEvent({
              event: "node_start",
              data: { node: nodeName, timestamp: Date.now() },
            });

            // Send workflow_status events for each stage info entry
            if (state.stageInfo && state.stageInfo.length > 0) {
              for (const info of state.stageInfo) {
                sendEvent({ event: "workflow_status", data: info });
              }
            }

            // Send node_output event
            if (state.nodeOutputs && state.nodeOutputs[nodeName]) {
              sendEvent({
                event: "node_output",
                data: {
                  node: nodeName,
                  output: state.nodeOutputs[nodeName],
                  timestamp: Date.now(),
                },
              });
            }

            // Send error event if any
            if (state.error) {
              sendEvent({ event: "error", data: { message: state.error } });
            }
          }
        }

        // Get final state for done event
        const finalState = await compiledGraph.getState({
          configurable: { thread_id: threadId },
        });

        const finalValues = finalState.values as WorkflowGraphStateType;

        // Collect output from output nodes
        const outputNodes = payload.nodes.filter(
          (n) => normalizeNodeType(n.type) === "output",
        );
        const finalResults = outputNodes
          .map((n) => finalValues.nodeOutputs?.[n.id])
          .filter(Boolean);

        // Note: stageInfo events were already emitted during streaming,
        // so we do NOT re-emit them here to avoid duplicates.

        // Send error if any
        if (finalValues.error) {
          sendEvent({ event: "error", data: { message: finalValues.error } });
        }

        // Send done event
        sendEvent({
          event: "done",
          data: {
            threadId,
            result: finalResults.join("\n\n---\n\n") || "工作流执行完成",
          },
        });
      } catch (error) {
        sendEvent({
          event: "error",
          data: {
            message: error instanceof Error ? error.message : "未知错误",
          },
        });
        sendEvent({ event: "done", data: { threadId: "" } });
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
      closed = true;
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
