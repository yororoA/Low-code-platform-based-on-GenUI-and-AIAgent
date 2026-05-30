import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { ChatGraphState, type ChatGraphStateType } from "./state";
import {
  adminNode,
  structureNode,
  alignmentNode,
  styleNode,
  interactionNode,
  styleEditNode,
  routeAfterAdmin,
  routeAfterAlignment,
} from "./nodes";
import type { BaseMessage } from "@langchain/core/messages";

// ======================== Chat Graph ========================
export function buildChatGraph() {
  const graph = new StateGraph(ChatGraphState)
    .addNode("admin", adminNode)
    .addNode("structure", structureNode)
    .addNode("alignment", alignmentNode)
    .addNode("style", styleNode)
    // Terminal nodes
    .addNode("end_text_only", async (state: ChatGraphStateType) => state)
    .addNode("end_with_error", async (state: ChatGraphStateType) => state)
    .addNode("end_alignment_failed", async (state: ChatGraphStateType) => {
      return {
        stageInfo: [{
          stage: "ALIGNMENT",
          message: `Alignment not passed after 10 attempts. Skip style stage.`,
          timestamp: Date.now(),
        }],
      };
    })
    // Edges
    .addEdge(START, "admin")
    // Route after admin
    .addConditionalEdges("admin", routeAfterAdmin, {
      structure: "structure",
      end_text_only: "end_text_only",
      end_with_error: "end_with_error",
    })
    // Structure -> Alignment
    .addEdge("structure", "alignment")
    // Route after alignment
    .addConditionalEdges("alignment", routeAfterAlignment, {
      structure: "structure",
      style: "style",
      end_with_error: "end_with_error",
      end_alignment_failed: "end_alignment_failed",
    })
    // Style -> END
    .addEdge("style", END)
    // Terminal nodes -> END
    .addEdge("end_text_only", END)
    .addEdge("end_with_error", END)
    .addEdge("end_alignment_failed", END);

  return graph;
}

// ======================== Interaction Graph ========================
export function buildInteractionGraph() {
  const graph = new StateGraph(ChatGraphState)
    .addNode("interaction", interactionNode)
    .addEdge(START, "interaction")
    .addEdge("interaction", END);

  return graph;
}

// ======================== Style Edit Graph ========================
export function buildStyleEditGraph() {
  const graph = new StateGraph(ChatGraphState)
    .addNode("style_edit", styleEditNode)
    .addEdge(START, "style_edit")
    .addEdge("style_edit", END);

  return graph;
}

// ======================== Compile Graphs with Checkpointer ========================
const checkpointer = new MemorySaver();

export function compileChatGraph() {
  return buildChatGraph().compile({ checkpointer });
}

export function compileInteractionGraph() {
  return buildInteractionGraph().compile({ checkpointer });
}

export function compileStyleEditGraph() {
  return buildStyleEditGraph().compile({ checkpointer });
}
