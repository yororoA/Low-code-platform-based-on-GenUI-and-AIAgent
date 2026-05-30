import type { StreamMessageEvent, StreamMessageResponse, AgentMessage, AgentMessagePart, ShowResponseData } from "@/types";

// Re-export for local use
type LocalAgentMessage = AgentMessage;
type LocalShowResponseData = ShowResponseData;

// ======================== Task Registry ========================
export const TaskRegistry = new Map<string, {
  controller: AbortController;
  isFocused: boolean;
  status: "streaming" | "done";
  messageBuffer: Map<string, AgentMessage>;
}>();

// ======================== SSE Event Parsing ========================
interface SSEEvent {
  event: string;
  data: string;
}

function parseSSELines(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = [];
  const lines = buffer.split("\n");
  let currentEvent = "";
  let currentData = "";
  let remaining = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("event: ")) {
      // If we had a previous event buffered, save it
      if (currentEvent && currentData) {
        events.push({ event: currentEvent, data: currentData });
      }
      currentEvent = line.slice(7).trim();
      currentData = "";
    } else if (line.startsWith("data: ")) {
      currentData = line.slice(6);
    } else if (line === "") {
      // Empty line = event boundary
      if (currentEvent && currentData) {
        events.push({ event: currentEvent, data: currentData });
        currentEvent = "";
        currentData = "";
      }
    } else {
      // Incomplete line, keep for next chunk
      remaining = lines.slice(i).join("\n");
      break;
    }
  }

  // If there's an incomplete event at the end
  if (!remaining && (currentEvent || currentData)) {
    remaining = `event: ${currentEvent}\ndata: ${currentData}`;
  }

  return { events, remaining };
}

// ======================== Convert SSE Events to Agent Messages ========================
let messageIdCounter = 0;
function generateId(): string {
  return `msg_${Date.now()}_${messageIdCounter++}`;
}

function sseEventToAgentMessages(event: SSEEvent): AgentMessage[] {
  const messages: AgentMessage[] = [];

  try {
    const data = JSON.parse(event.data);

    switch (event.event) {
      case "stage_info": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "stage-info",
            stage: data.stage,
            message: data.message,
          }],
        });
        break;
      }

      case "admin_output": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "admin-output",
            text: data.text,
            necessary: data.necessary,
            uiDescription: data.uiDescription,
            uiNeeds: data.uiNeeds,
          }],
        });
        // Also add text part for the admin's text response
        if (data.text) {
          messages.push({
            id: generateId(),
            role: "assistant",
            parts: [{ type: "text", text: data.text }],
          });
        }
        break;
      }

      case "structure_output": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "structure-output",
            uiTree: data.uiTree,
            styleSummary: data.styleSummary,
            interactions: data.interactions,
            pages: data.pages,
          }],
        });
        break;
      }

      case "alignment_output": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "alignment-output",
            score: data.score,
            verdict: data.verdict,
            violationsCount: data.violationsCount,
          }],
        });
        break;
      }

      case "style_output": {
        // When we get style output, combine with structure to create show-response
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "style-output",
            styles: data.styles,
          }],
        });
        break;
      }

      case "interaction_output": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "interaction-output",
            uiTree: data.uiTree,
            styles: data.styles,
            interactions: data.interactions,
            pages: data.pages,
          }],
        });
        break;
      }

      case "style_edit_output": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "style-edit-output",
            styleEdits: data.styleEdits,
          }],
        });
        break;
      }

      case "node_start": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "node-start",
            node: data.node,
          }],
        });
        break;
      }

      case "node_output": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{
            type: "node-output",
            node: data.node,
            output: data.output,
          }],
        });
        break;
      }

      case "error": {
        messages.push({
          id: generateId(),
          role: "assistant",
          parts: [{ type: "error", message: data.message }],
        });
        break;
      }

      case "done":
      case "heartbeat":
        // No message needed for these
        break;

      default:
        // Unknown event type, skip
        break;
    }
  } catch {
    // Parse error, skip
  }

  return messages;
}

// ======================== Build Merged Assistant Messages ========================
function buildMergedAssistantMessages(
  taskId: string,
  messageBuffer: Map<string, AgentMessage>,
): AgentMessage[] {
  const partsBuffer: AgentMessagePart[] = [];

  // Collect all meaningful parts, deduplicating stage-info
  const seenStageKeys = new Set<string>();
  let adminOutput: AgentMessagePart | null = null;
  let structureOutput: AgentMessagePart | null = null;
  let styleOutput: AgentMessagePart | null = null;
  let interactionOutput: AgentMessagePart | null = null;
  let styleEditOutput: AgentMessagePart | null = null;
  const otherParts: AgentMessagePart[] = [];

  for (const message of messageBuffer.values()) {
    for (const part of message.parts) {
      if (part.type === "stage-info") {
        const key = `${part.stage}|${part.message}`;
        if (!seenStageKeys.has(key)) {
          seenStageKeys.add(key);
          otherParts.push(part);
        }
      } else if (part.type === "admin-output") {
        adminOutput = part;
      } else if (part.type === "structure-output") {
        structureOutput = part;
      } else if (part.type === "style-output") {
        styleOutput = part;
      } else if (part.type === "interaction-output") {
        interactionOutput = part;
      } else if (part.type === "style-edit-output") {
        styleEditOutput = part;
      } else if (part.type === "text") {
        otherParts.push(part);
      } else if (part.type === "error") {
        otherParts.push(part);
      } else if (part.type === "alignment-output") {
        otherParts.push(part);
      } else if (part.type === "node-start" || part.type === "node-output") {
        // Skip node tracking parts from merged output
      }
    }
  }

  // Build show-response from admin + structure + style
  if (adminOutput && adminOutput.type === "admin-output" && adminOutput.necessary) {
    if (structureOutput && structureOutput.type === "structure-output" && styleOutput && styleOutput.type === "style-output") {
      const showResponse: ShowResponseData = {
        topic: adminOutput.text,
        uiTree: structureOutput.uiTree,
        styles: styleOutput.styles,
        interactions: structureOutput.interactions,
        pages: structureOutput.pages,
      };
      partsBuffer.push({ type: "show-response", data: showResponse });
    }
  }

  // Build show-response for interaction
  if (interactionOutput && interactionOutput.type === "interaction-output") {
    const showResponse: ShowResponseData = {
      topic: "Interaction Result",
      uiTree: interactionOutput.uiTree,
      styles: interactionOutput.styles,
      interactions: interactionOutput.interactions,
      pages: interactionOutput.pages,
    };
    partsBuffer.push({ type: "show-response", data: showResponse });
  }

  // Add other parts
  partsBuffer.push(...otherParts);

  return [{
    id: taskId,
    role: "assistant",
    parts: partsBuffer,
  } as AgentMessage];
}

// ======================== Helper: Read LLM config headers ========================
// NOTE: Web Workers cannot access localStorage, so config headers are passed
// from the main thread via the StreamMessageEvent message.
let cachedLlmConfigHeaders: Record<string, string> = {};

// ======================== Stream Parser ========================
async function* parseLangGraphStream(
  messages: AgentMessage[],
  apiBaseUrl: string,
  controller: AbortController,
  requestType?: "chat" | "interaction" | "style-edit",
  interactionPayload?: { type: string; description: string; currentPageContext?: string },
  styleEditPayload?: { uiTreeSummary: string; currentStyles: string; editRequest: string },
): AsyncGenerator<AgentMessage[], void, unknown> {
  const apiUrl = (() => {
    if (apiBaseUrl) return new URL("/api/chat", apiBaseUrl).toString();
    return new URL("/api/chat", self.location.href).toString();
  })();

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cachedLlmConfigHeaders },
      body: JSON.stringify({
        messages,
        requestType: requestType || "chat",
        interactionPayload,
        styleEditPayload,
      }),
      signal: controller.signal,
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
    const parsedMessagesMap = new Map<string, AgentMessage>();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process remaining buffer
        if (buffer.trim()) {
          const { events } = parseSSELines(buffer);
          for (const event of events) {
            const msgs = sseEventToAgentMessages(event);
            for (const msg of msgs) {
              parsedMessagesMap.set(msg.id, msg);
            }
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const { events, remaining } = parseSSELines(buffer);
      buffer = remaining;

      for (const event of events) {
        const msgs = sseEventToAgentMessages(event);
        for (const msg of msgs) {
          parsedMessagesMap.set(msg.id, msg);
        }
      }

      if (parsedMessagesMap.size >= 1) {
        yield [...parsedMessagesMap.values()];
        parsedMessagesMap.clear();
      }
    }

    // Final yield
    if (parsedMessagesMap.size > 0) {
      yield [...parsedMessagesMap.values()];
      parsedMessagesMap.clear();
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    throw error;
  } finally {
    controller.abort();
  }
}

// ======================== Worker Message Handler ========================
onmessage = async (event: MessageEvent<StreamMessageEvent>) => {
  const { type, id } = event.data;

  if (type === "send") {
    const { messages, apiBaseUrl, llmConfigHeaders } = event.data;
    // Cache LLM config headers from main thread (worker can't access localStorage)
    if (llmConfigHeaders) {
      cachedLlmConfigHeaders = llmConfigHeaders;
    }
    const controller = new AbortController();

    TaskRegistry.set(id, {
      controller,
      isFocused: true,
      status: "streaming",
      messageBuffer: new Map<string, AgentMessage>(),
    });

    try {
      for await (const chunk of parseLangGraphStream(messages, apiBaseUrl, controller)) {
        const task = TaskRegistry.get(id);
        if (!task) break;

        chunk.forEach(message => task.messageBuffer.set(message.id, message));

        self.postMessage({
          type: "message",
          id,
          data: buildMergedAssistantMessages(id, task.messageBuffer),
        } as StreamMessageResponse);
      }

      if (TaskRegistry.has(id)) {
        const task = TaskRegistry.get(id);
        self.postMessage({
          type: "complete",
          id,
          data: buildMergedAssistantMessages(id, task?.messageBuffer ?? new Map<string, AgentMessage>()),
        } as StreamMessageResponse);
        if (task?.isFocused) {
          TaskRegistry.delete(id);
        } else if (task) {
          task.status = "done";
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        self.postMessage({
          type: "error",
          id,
          error: error.message,
        } as StreamMessageResponse);
      } else if (!(error instanceof Error)) {
        self.postMessage({
          type: "error",
          id,
          error: JSON.stringify(error),
        } as StreamMessageResponse);
      }
      TaskRegistry.delete(id);
    }
  } else if (type === "cancel") {
    const task = TaskRegistry.get(id);
    if (task) {
      task.controller.abort();
      TaskRegistry.delete(id);
      self.postMessage({ type: "canceled", id } as StreamMessageResponse);
    }
  } else if (type === "offline") {
    const task = TaskRegistry.get(id);
    if (task) task.isFocused = false;
  } else if (type === "online") {
    const task = TaskRegistry.get(id);
    if (task && !task.isFocused) {
      task.isFocused = true;
      if (task.status === "done") TaskRegistry.delete(id);
    }
  } else if (type === "cancelAll") {
    for (const task of TaskRegistry.values()) task.controller.abort();
    TaskRegistry.clear();
  }
};
