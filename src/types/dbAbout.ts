import type { AgentMessage } from "./chatStreamingTypes";

export interface DataItemSummary {
  id: string;
  topic: string;
  timestamp: Date;
}

export interface DataItem extends DataItemSummary {
  messages: AgentMessage[];
}

export type OperationType =
  | 'delete'
  | 'new_store'
  | 'open'
  | 'close'
  | 'add'
  | 'update'
  | 'delete'
  | 'get'
  | 'getByIndex'
  | 'getAllByIndex'
  | 'getAllIndexValue'
  | 'getAllIds'
  | 'getSummary';

export interface ExecuteOptions {
  operationType: OperationType;
  store_name?: string;
  data?: DataItem;
  id?: string;
  indexName?: string;
  indexValue?: string,
}