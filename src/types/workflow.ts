import { Node, Edge } from '@xyflow/react';

export type WorkflowNodeType = 'input' | 'requirement' | 'agent' | 'condition' | 'output';

export type AgentType = 'design' | 'build' | 'review';

export type HistoryOperationType =
  | 'node_added'
  | 'nodes_added'
  | 'node_deleted'
  | 'nodes_deleted'
  | 'edge_added'
  | 'edges_added'
  | 'edge_deleted'
  | 'edges_deleted'
  | 'node_moved'
  | 'nodes_moved'
  | 'label_changed'
  | 'color_changed'
  | 'type_changed'
  | 'edge_inserted';

export interface HistoryOperation {
  type: HistoryOperationType;
  timestamp: Date;
  description: string;
  affectedIds?: string[];
}

export interface WorkflowHistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

export interface WorkflowProjectSummary {
  id: string;
  topic: string;
  timestamp: Date;
}

export interface WorkflowProject extends WorkflowProjectSummary {
  nodes: Node[];
  edges: Edge[];
  historyOperations: HistoryOperation[];
  historySnapshots?: WorkflowHistorySnapshot[];
}

export type WorkflowOperationType =
  | 'delete'
  | 'new_store'
  | 'open'
  | 'close'
  | 'add'
  | 'update'
  | 'get'
  | 'getAllIds'
  | 'getSummary';

export interface WorkflowExecuteOptions {
  operationType: WorkflowOperationType;
  store_name?: string;
  data?: WorkflowProject;
  id?: string;
}

export interface WorkflowNodeData {
  label: string;
  workflowType: WorkflowNodeType;
  inputText: string;
  agentType?: AgentType;
  inputHandles?: string[];
  outputHandles?: string[];
  [key: string]: unknown;
}

export interface WorkflowRunPayload {
  nodes: {
    id: string;
    type: WorkflowNodeType;
    label: string;
    inputText: string;
    agentType?: AgentType;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }[];
}

export type WorkflowStreamEvent =
  | { type: 'building'; message: string }
  | { type: 'focus'; nodeId: string }
  | { type: 'branch'; condition: string; taken: boolean }
  | { type: 'agent_output'; nodeId: string; output: string }
  | { type: 'done'; result: string }
  | { type: 'error'; message: string };
