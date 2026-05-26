import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import type { InteractionDefinition, PageDefinition } from "@/types/interaction";
import type { LLMConfig } from "./llm";

// ======================== Admin Agent Output ========================
export interface AdminToolOutput {
  text: string;
  necessary: boolean;
  uiDescription: string;
  uiNeeds: string[];
}

// ======================== Structure Agent Output ========================
export interface StructureOutput {
  uiTree: string;
  styleSummary: string;
  interactions?: InteractionDefinition[];
  pages?: PageDefinition[];
}

// ======================== Alignment Agent Output ========================
export interface AlignmentViolation {
  code: "NEED_NOT_COVERED" | "LAYOUT_MISMATCH" | "INFORMATION_INCOMPLETENESS" | "DSL_INVALID" | "STYLE_ONLY_FEEDBACK" | "OTHER";
  stage: "structure" | "style" | "data" | "interaction";
  severity: "low" | "medium" | "high";
  message: string;
  suggestion: string;
}

export interface AlignmentOutput {
  alignmentScore: number;
  verdict: "pass" | "retry";
  violations: AlignmentViolation[];
  retryPrompt: string;
}

// ======================== Style Agent Output ========================
export interface StyleOutput {
  styles: Array<{
    id: string;
    className?: string;
    classNames?: Record<string, string>;
  }>;
}

// ======================== Interaction Agent Output ========================
export interface InteractionOutput {
  uiTree: string;
  styleSummary: string;
  interactions?: InteractionDefinition[];
  pages?: PageDefinition[];
}

// ======================== Style Edit Agent Output ========================
export interface StyleEditOutput {
  styleEdits: Array<{
    nodeId: string;
    action: "replace-class" | "add-class" | "remove-class";
    className?: string;
  }>;
}

// ======================== Chat Graph State ========================
export const ChatGraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
  }),
  // Admin stage
  adminOutput: Annotation<AdminToolOutput | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Normalized UI needs after validation
  normalizedUiNeeds: Annotation<string[]>({
    reducer: (_, newVal) => newVal,
    default: () => [],
  }),
  // Structure stage
  structureOutput: Annotation<StructureOutput | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  structureAttempt: Annotation<number>({
    reducer: (_, newVal) => newVal,
    default: () => 0,
  }),
  // Alignment stage
  alignmentOutput: Annotation<AlignmentOutput | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Style stage
  styleOutput: Annotation<StyleOutput | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Interaction (for interaction requests)
  interactionOutput: Annotation<InteractionOutput | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Style edit
  styleEditOutput: Annotation<StyleEditOutput | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Request type: determines which graph path to take
  requestType: Annotation<"chat" | "interaction" | "style-edit">({
    reducer: (_, newVal) => newVal,
    default: () => "chat",
  }),
  // Interaction request payload
  interactionPayload: Annotation<{
    type: string;
    description: string;
    currentPageContext?: string;
  } | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Style edit request payload
  styleEditPayload: Annotation<{
    uiTreeSummary: string;
    currentStyles: string;
    editRequest: string;
  } | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Stage info messages for frontend tracking
  stageInfo: Annotation<StageInfoEntry[]>({
    reducer: (prev, newVal) => [...prev, ...newVal],
    default: () => [],
  }),
  // Error tracking
  error: Annotation<string | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // LLM config from request headers
  llmConfig: Annotation<LLMConfig | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
});

export type ChatGraphStateType = typeof ChatGraphState.State;

// ======================== Stage Info ========================
export interface StageInfoEntry {
  stage: string;
  message: string;
  timestamp: number;
}

// ======================== Workflow Graph State ========================
export const WorkflowGraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
  }),
  // Accumulated context from upstream nodes
  accumulatedContext: Annotation<string>({
    reducer: (_, newVal) => newVal,
    default: () => "",
  }),
  // Node outputs: nodeId -> output text
  nodeOutputs: Annotation<Record<string, string>>({
    reducer: (prev, newVal) => ({ ...prev, ...newVal }),
    default: () => ({}),
  }),
  // Currently focused node (for frontend tracking)
  focusedNodeId: Annotation<string | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Stage info for workflow execution tracking
  stageInfo: Annotation<WorkflowStageInfo[]>({
    reducer: (prev, newVal) => [...prev, ...newVal],
    default: () => [],
  }),
  // Error tracking
  error: Annotation<string | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
  // Branch evaluation result: nodeId -> boolean (true = condition met)
  branchResults: Annotation<Record<string, boolean>>({
    reducer: (prev, newVal) => ({ ...prev, ...newVal }),
    default: () => ({}),
  }),
  // LLM config from request headers
  llmConfig: Annotation<LLMConfig | null>({
    reducer: (_, newVal) => newVal,
    default: () => null,
  }),
});

export type WorkflowGraphStateType = typeof WorkflowGraphState.State;

export interface WorkflowStageInfo {
  nodeId: string;
  nodeLabel: string;
  type: "focus" | "building" | "branch" | "agent_output" | "done" | "error";
  message: string;
  timestamp: number;
}
