'use client';

import React, { useCallback, useContext } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { type WorkflowNodeData, type AgentType, type WorkflowNodeType } from '@/types';
import { cn } from '@/lib/utils';

const WORKFLOW_TYPE_CONFIG: Record<WorkflowNodeType, { label: string; color: string; inputTitle: string }> = {
  input: { label: '输入(预期的页面)', color: '#3b82f6', inputTitle: '想要实现的页面需求' },
  requirement: { label: '对页面的详细要求', color: '#8b5cf6', inputTitle: '对于页面设计的更详细要求' },
  agent: { label: '智能体', color: '#f97316', inputTitle: '该智能体的任务' },
  branch: { label: '分支', color: '#eab308', inputTitle: '分支判断条件' },
  condition: { label: '分支', color: '#eab308', inputTitle: '分支判断条件' },
  output: { label: '输出', color: '#22c55e', inputTitle: '' },
};

export const WorkflowNodeActionsContext = React.createContext<{
  updateNodeData: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
}>({ updateNodeData: () => {} });

export const WORKFLOW_NODE_TYPE_MAP: Record<WorkflowNodeType, string> = {
  input: 'workflowInput',
  requirement: 'workflowRequirement',
  agent: 'workflowAgent',
  branch: 'workflowBranch',
  condition: 'workflowCondition',
  output: 'workflowOutput',
};

export const REACT_FLOW_TO_WORKFLOW_TYPE: Record<string, WorkflowNodeType> = {
  workflowInput: 'input',
  workflowRequirement: 'requirement',
  workflowAgent: 'agent',
  workflowBranch: 'branch',
  workflowCondition: 'branch',
  workflowOutput: 'output',
};

export function getReactFlowNodeType(workflowType: WorkflowNodeType): string {
  return WORKFLOW_NODE_TYPE_MAP[workflowType];
}

export function getWorkflowTypeFromReactFlowNode(reactFlowType: string | undefined): WorkflowNodeType {
  if (!reactFlowType) return 'requirement';
  return REACT_FLOW_TO_WORKFLOW_TYPE[reactFlowType] || 'requirement';
}

export const WORKFLOW_TYPE_OPTIONS: { value: WorkflowNodeType; label: string }[] = [
  { value: 'input', label: '输入(预期的页面)' },
  { value: 'requirement', label: '对页面的详细要求' },
  { value: 'agent', label: '智能体' },
  { value: 'branch', label: '分支' },
  { value: 'output', label: '输出' },
];

export const DEFAULT_NODE_COLORS: Record<WorkflowNodeType, string> = {
  input: '#3b82f6',
  requirement: '#8b5cf6',
  agent: '#f97316',
  branch: '#eab308',
  condition: '#eab308',
  output: '#22c55e',
};

export const TEMP_TARGET_HANDLE_ID = '__target__';
export const TEMP_SOURCE_HANDLE_ID = '__source__';
export const BRANCH_TRUE_SOURCE_HANDLE_ID = 'cond-true';
export const BRANCH_FALSE_SOURCE_HANDLE_ID = 'cond-false';
export const CONDITION_TRUE_SOURCE_HANDLE_ID = BRANCH_TRUE_SOURCE_HANDLE_ID;
export const CONDITION_FALSE_SOURCE_HANDLE_ID = BRANCH_FALSE_SOURCE_HANDLE_ID;

const normalizeHandleIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const calcHandleTop = (index: number, total: number): string => {
  if (total <= 1) return '50%';
  const start = 16;
  const end = 84;
  const percent = start + (index * (end - start)) / (total - 1);
  return `${percent}%`;
};

const calcHandleLeft = (index: number, total: number): string => {
  if (total <= 1) return '50%';
  const start = 16;
  const end = 84;
  const percent = start + (index * (end - start)) / (total - 1);
  return `${percent}%`;
};

const SOURCE_SIDE_ORDER: Position[] = [Position.Right, Position.Bottom, Position.Top, Position.Left];
const TARGET_SIDE_ORDER: Position[] = [Position.Left, Position.Top, Position.Bottom, Position.Right];

const parseHandleSide = (handleId: string): Position | null => {
  const match = handleId.match(/^(?:in|out)-(left|right|top|bottom)-/);
  if (!match) return null;
  const side = match[1];
  if (side === 'left') return Position.Left;
  if (side === 'right') return Position.Right;
  if (side === 'top') return Position.Top;
  if (side === 'bottom') return Position.Bottom;
  return null;
};

const getHandlePlacement = (index: number, total: number, isSource: boolean) => {
  const sideOrder = isSource ? SOURCE_SIDE_ORDER : TARGET_SIDE_ORDER;
  const side = sideOrder[index % sideOrder.length];
  const lane = Math.floor(index / sideOrder.length);
  const laneCount = Math.max(1, Math.ceil(total / sideOrder.length));

  if (side === Position.Left || side === Position.Right) {
    return {
      position: side,
      style: { top: calcHandleTop(lane, laneCount) },
    };
  }

  return {
    position: side,
    style: { left: calcHandleLeft(lane, laneCount) },
  };
};

const getHandlePlacementById = (
  handleId: string,
  allHandles: string[],
  index: number,
  isSource: boolean,
) => {
  const preferredSide = parseHandleSide(handleId);
  if (!preferredSide) {
    return getHandlePlacement(index, allHandles.length, isSource);
  }

  const sameSideHandles = allHandles.filter((id) => parseHandleSide(id) === preferredSide);
  const sideIndex = Math.max(0, sameSideHandles.indexOf(handleId));

  if (preferredSide === Position.Left || preferredSide === Position.Right) {
    return {
      position: preferredSide,
      style: { top: calcHandleTop(sideIndex, sameSideHandles.length) },
    };
  }

  return {
    position: preferredSide,
    style: { left: calcHandleLeft(sideIndex, sameSideHandles.length) },
  };
};

function WorkflowNodeComponent({ id, data, selected }: NodeProps<Node<WorkflowNodeData>>) {
  const { updateNodeData } = useContext(WorkflowNodeActionsContext);
  const workflowType = data.workflowType || 'requirement';
  const normalizedWorkflowType: WorkflowNodeType = workflowType === 'condition' ? 'branch' : workflowType;
  const config = WORKFLOW_TYPE_CONFIG[normalizedWorkflowType];
  const isInput = workflowType === 'input';
  const isOutput = workflowType === 'output';
  const isAgent = workflowType === 'agent';
  const isBranch = normalizedWorkflowType === 'branch';
  const isFocused = (data as Record<string, unknown>).isFocused as boolean;
  const inputHandles = normalizeHandleIds(data.inputHandles);
  const outputHandles = normalizeHandleIds(data.outputHandles);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { inputText: e.target.value });
  }, [id, updateNodeData]);

  const handleAgentTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(id, { agentType: e.target.value as AgentType });
  }, [id, updateNodeData]);

  return (
    <div
      className={cn(
        'rounded-lg shadow-md border bg-white min-w-[240px] max-w-[300px] transition-shadow',
        selected && 'ring-2 ring-blue-400',
        isFocused && 'ring-2 ring-blue-500 shadow-lg shadow-blue-200',
      )}
      style={{ borderTop: `3px solid ${config.color}` }}
    >
      {!isInput && (
        <>
          {inputHandles.map((handleId, index) => (
            (() => {
              const placement = getHandlePlacementById(handleId, inputHandles, index, false);
              return (
                <Handle
                  key={`target-${handleId}`}
                  id={handleId}
                  type="target"
                  position={placement.position}
                  className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
                  style={placement.style}
                />
              );
            })()
          ))}
          <Handle
            id={TEMP_TARGET_HANDLE_ID}
            type="target"
            position={Position.Left}
            className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white"
            style={{ top: '50%' }}
          />
        </>
      )}

      <div className="px-3 py-1.5" style={{ backgroundColor: `${config.color}15` }}>
        <div className="text-xs font-semibold" style={{ color: config.color }}>
          {config.label}
        </div>
      </div>

      {!isOutput && (
        <div className="px-3 py-2 space-y-2">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">{config.inputTitle}</label>
            <textarea
              value={data.inputText || ''}
              onChange={handleInputChange}
              placeholder={config.inputTitle}
              className="w-full text-xs text-foreground placeholder:text-muted-foreground border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
              rows={2}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>

          {isAgent && (
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">类型选择</label>
              <select
                value={data.agentType || 'review'}
                onChange={handleAgentTypeChange}
                className="w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <option value="design">设计</option>
                <option value="build">构建</option>
                <option value="review">审查</option>
              </select>
            </div>
          )}
        </div>
      )}

      {isOutput && (
        <div className="px-3 py-2">
          <div className="text-xs text-gray-400 italic">工作流输出节点</div>
        </div>
      )}

      {!isOutput && (
        <>
          {isBranch && (
            <>
              <Handle
                id={BRANCH_TRUE_SOURCE_HANDLE_ID}
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
                style={{ top: '30%' }}
              />
              <div className="absolute -right-14 top-[24%] text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 pointer-events-none">
                成立
              </div>
              <Handle
                id={BRANCH_FALSE_SOURCE_HANDLE_ID}
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white"
                style={{ top: '70%' }}
              />
              <div className="absolute -right-14 top-[64%] text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 pointer-events-none">
                不成立
              </div>
            </>
          )}

          {outputHandles.map((handleId, index) => (
            (() => {
              const placement = getHandlePlacementById(handleId, outputHandles, index, true);
              return (
                <Handle
                  key={`source-${handleId}`}
                  id={handleId}
                  type="source"
                  position={placement.position}
                  className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
                  style={placement.style}
                />
              );
            })()
          ))}
          {!isBranch && (
            <Handle
              id={TEMP_SOURCE_HANDLE_ID}
              type="source"
              position={Position.Right}
              className="!w-3 !h-3 !bg-slate-500 !border-2 !border-white"
              style={{ top: '50%' }}
            />
          )}
        </>
      )}
    </div>
  );
}

export const workflowNodeTypes = {
  workflowInput: WorkflowNodeComponent,
  workflowRequirement: WorkflowNodeComponent,
  workflowAgent: WorkflowNodeComponent,
  workflowBranch: WorkflowNodeComponent,
  workflowCondition: WorkflowNodeComponent,
  workflowOutput: WorkflowNodeComponent,
};

export function getDefaultNodeData(workflowType: WorkflowNodeType): WorkflowNodeData {
  const normalizedWorkflowType: WorkflowNodeType = workflowType === 'condition' ? 'branch' : workflowType;
  return {
    label: WORKFLOW_TYPE_CONFIG[normalizedWorkflowType].label,
    workflowType: normalizedWorkflowType,
    inputText: '',
    agentType: normalizedWorkflowType === 'agent' ? 'review' : undefined,
    inputHandles: [],
    outputHandles: [],
  };
}

export function migrateLegacyNode(node: Node): Node {
  const oldType = node.type;
  let workflowType: WorkflowNodeType = 'requirement';

  if (oldType === 'input') {
    workflowType = 'input';
  } else if (oldType === 'output') {
    workflowType = 'output';
  } else if (oldType === 'condition' || oldType === 'workflowCondition') {
    workflowType = 'branch';
  }

  const existingData = node.data || {};
  const hasWorkflowType = 'workflowType' in existingData && existingData.workflowType;

  if (hasWorkflowType) {
    const rawWt = existingData.workflowType as WorkflowNodeType;
    const wt: WorkflowNodeType = rawWt === 'condition' ? 'branch' : rawWt;
    return {
      ...node,
      type: getReactFlowNodeType(wt),
      data: {
        ...existingData,
        workflowType: wt,
        inputText: existingData.inputText || '',
        agentType: existingData.agentType || (wt as string === 'agent' ? 'review' : undefined),
        inputHandles: normalizeHandleIds(existingData.inputHandles),
        outputHandles: normalizeHandleIds(existingData.outputHandles),
      } as WorkflowNodeData,
    };
  }

  const resolvedWorkflowType: WorkflowNodeType = workflowType;
  return {
    ...node,
    type: getReactFlowNodeType(resolvedWorkflowType),
    data: {
      ...existingData,
      label: existingData.label || WORKFLOW_TYPE_CONFIG[resolvedWorkflowType].label,
      workflowType: resolvedWorkflowType,
      inputText: '',
      agentType: (resolvedWorkflowType as string) === 'agent' ? 'review' : undefined,
      inputHandles: normalizeHandleIds(existingData.inputHandles),
      outputHandles: normalizeHandleIds(existingData.outputHandles),
    } as WorkflowNodeData,
  };
}
