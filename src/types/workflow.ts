import { Node, Edge } from '@xyflow/react';

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
