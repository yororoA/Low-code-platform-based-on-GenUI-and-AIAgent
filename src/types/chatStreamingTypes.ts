import type { InteractionDefinition, PageDefinition } from "./interaction";

// ======================== Agent Message Types ========================
export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: AgentMessagePart[];
}

export type AgentMessagePart =
  | { type: "text"; text: string }
  | { type: "stage-info"; stage: string; message: string }
  | { type: "admin-output"; text: string; necessary: boolean; uiDescription: string; uiNeeds: string[] }
  | { type: "structure-output"; uiTree: string; styleSummary: string; interactions?: InteractionDefinition[]; pages?: PageDefinition[] }
  | { type: "alignment-output"; score: number; verdict: string; violationsCount: number }
  | { type: "style-output"; styles: Array<{ id: string; className?: string; classNames?: Record<string, string> }> }
  | { type: "show-response"; data: ShowResponseData }
  | { type: "interaction-output"; uiTree: string; styles: Array<{ id: string; className?: string; classNames?: Record<string, string> }>; interactions?: InteractionDefinition[]; pages?: PageDefinition[] }
  | { type: "style-edit-output"; styleEdits: Array<{ nodeId: string; action: string; className?: string }> }
  | { type: "error"; message: string }
  | { type: "node-start"; node: string }
  | { type: "node-output"; node: string; output: unknown };

export interface ShowResponseData {
  topic?: string;
  uiTree?: string;
  styles?: Array<{ id: string; className?: string; classNames?: Record<string, string> }>;
  interactions?: InteractionDefinition[];
  pages?: PageDefinition[];
}

// ======================== Worker Events ========================
export type StreamMessageEvent = {
  type: "send";
  id: string;
  messages: AgentMessage[];
  apiBaseUrl: string;
} | {
  type: "cancel" | "cancelAll" | "offline" | "online";
  id: string;
};

export type StreamMessageResponse = {
  type: "message" | "error" | "complete" | "canceled";
  id: string;
  data?: AgentMessage[];
  error?: string;
};
