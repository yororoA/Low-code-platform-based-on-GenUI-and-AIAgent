import type { ChatGraphStateType, StageInfoEntry, WorkflowStageInfo } from "./state";

// ======================== SSE Event Types ========================
export type SSEEvent =
  | { event: "node_start"; data: { node: string; timestamp: number } }
  | { event: "node_output"; data: { node: string; output: unknown; timestamp: number } }
  | { event: "stage_info"; data: StageInfoEntry }
  | { event: "admin_output"; data: { text: string; necessary: boolean; uiDescription: string; uiNeeds: string[] } }
  | { event: "structure_output"; data: { uiTree: string; styleSummary: string; interactions?: unknown; pages?: unknown } }
  | { event: "alignment_output"; data: { score: number; verdict: string; violationsCount: number } }
  | { event: "style_output"; data: { styles: unknown } }
  | { event: "interaction_output"; data: { uiTree: string; styles: unknown; interactions?: unknown; pages?: unknown } }
  | { event: "style_edit_output"; data: { styleEdits: unknown } }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: { threadId: string; checkpointId?: string; result?: string } }
  | { event: "workflow_status"; data: WorkflowStageInfo }
  | { event: "heartbeat"; data: Record<string, never> };

const encoder = new TextEncoder();

export function encodeSSE(event: SSEEvent): Uint8Array {
  return encoder.encode(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
}

// ======================== Graph State to SSE Events ========================
export function stateToSSEEvents(
  nodeName: string,
  state: Partial<ChatGraphStateType>,
): SSEEvent[] {
  const events: SSEEvent[] = [];
  const timestamp = Date.now();

  // Node start
  events.push({ event: "node_start", data: { node: nodeName, timestamp } });

  // Stage info
  if (state.stageInfo && state.stageInfo.length > 0) {
    for (const info of state.stageInfo) {
      events.push({ event: "stage_info", data: info });
    }
  }

  // Node-specific outputs
  switch (nodeName) {
    case "admin":
      if (state.adminOutput) {
        events.push({
          event: "admin_output",
          data: {
            text: state.adminOutput.text,
            necessary: state.adminOutput.necessary,
            uiDescription: state.adminOutput.uiDescription,
            uiNeeds: state.adminOutput.uiNeeds,
          },
        });
      }
      break;
    case "structure":
      if (state.structureOutput) {
        events.push({
          event: "structure_output",
          data: {
            uiTree: state.structureOutput.uiTree,
            styleSummary: state.structureOutput.styleSummary,
            interactions: state.structureOutput.interactions,
            pages: state.structureOutput.pages,
          },
        });
      }
      break;
    case "alignment":
      if (state.alignmentOutput) {
        events.push({
          event: "alignment_output",
          data: {
            score: state.alignmentOutput.alignmentScore,
            verdict: state.alignmentOutput.verdict,
            violationsCount: state.alignmentOutput.violations.length,
          },
        });
      }
      break;
    case "style":
      if (state.styleOutput) {
        events.push({
          event: "style_output",
          data: { styles: state.styleOutput.styles },
        });
      }
      break;
    case "interaction":
      if (state.interactionOutput) {
        events.push({
          event: "interaction_output",
          data: {
            uiTree: state.interactionOutput.uiTree,
            styles: state.styleOutput?.styles,
            interactions: state.interactionOutput.interactions,
            pages: state.interactionOutput.pages,
          },
        });
      }
      break;
    case "style_edit":
      if (state.styleEditOutput) {
        events.push({
          event: "style_edit_output",
          data: { styleEdits: state.styleEditOutput.styleEdits },
        });
      }
      break;
  }

  // Node output
  events.push({ event: "node_output", data: { node: nodeName, output: getNodeOutput(nodeName, state), timestamp } });

  // Error
  if (state.error) {
    events.push({ event: "error", data: { message: state.error } });
  }

  return events;
}

function getNodeOutput(nodeName: string, state: Partial<ChatGraphStateType>): unknown {
  switch (nodeName) {
    case "admin": return state.adminOutput;
    case "structure": return state.structureOutput;
    case "alignment": return state.alignmentOutput;
    case "style": return state.styleOutput;
    case "interaction": return state.interactionOutput;
    case "style_edit": return state.styleEditOutput;
    default: return null;
  }
}

// ======================== Final State to SSE Events ========================
export function finalStateToSSEEvents(
  state: ChatGraphStateType,
  threadId: string,
): SSEEvent[] {
  const events: SSEEvent[] = [];

  // Note: stage_info events are already emitted during streaming via stateToSSEEvents,
  // so we do NOT re-emit them here to avoid duplicates.

  // Error
  if (state.error) {
    events.push({ event: "error", data: { message: state.error } });
  }

  // Done
  events.push({ event: "done", data: { threadId } });

  return events;
}
