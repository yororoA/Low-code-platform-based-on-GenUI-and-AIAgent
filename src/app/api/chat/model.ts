// Re-export AgentMessage as AdminAgentMessage for backward compatibility
// The old AI SDK ToolLoopAgent types have been replaced by the LangGraph-based architecture.
// All agent logic now lives in nodes.ts; this file only preserves the type alias.
export type { AgentMessage as AdminAgentMessage } from "@/types";
