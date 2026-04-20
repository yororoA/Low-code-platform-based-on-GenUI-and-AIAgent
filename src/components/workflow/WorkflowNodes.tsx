'use client';

import React, { useCallback, useContext } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { type WorkflowNodeData, type AgentType, type WorkflowNodeType } from '@/types';
import { cn } from '@/lib/utils';

const WORKFLOW_TYPE_CONFIG: Record<WorkflowNodeType, { label: string; color: string; inputTitle: string }> = {
  input: { label: '输入(预期的页面)', color: '#3b82f6', inputTitle: '想要实现的页面需求' },
  requirement: { label: '对页面的详细要求', color: '#8b5cf6', inputTitle: '对于页面设计的更详细要求' },
  agent: { label: '智能体', color: '#f97316', inputTitle: '该智能体的任务' },
  condition: { label: '条件', color: '#eab308', inputTitle: '进入该支路的条件' },
  output: { label: '输出', color: '#22c55e', inputTitle: '' },
};

export const WorkflowNodeActionsContext = React.createContext<{
  updateNodeData: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
}>({ updateNodeData: () => {} });

export const WORKFLOW_NODE_TYPE_MAP: Record<WorkflowNodeType, string> = {
  input: 'workflowInput',
  requirement: 'workflowRequirement',
  agent: 'workflowAgent',
  condition: 'workflowCondition',
  output: 'workflowOutput',
};

export const REACT_FLOW_TO_WORKFLOW_TYPE: Record<string, WorkflowNodeType> = {
  workflowInput: 'input',
  workflowRequirement: 'requirement',
  workflowAgent: 'agent',
  workflowCondition: 'condition',
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
  { value: 'condition', label: '条件' },
  { value: 'output', label: '输出' },
];

export const DEFAULT_NODE_COLORS: Record<WorkflowNodeType, string> = {
  input: '#3b82f6',
  requirement: '#8b5cf6',
  agent: '#f97316',
  condition: '#eab308',
  output: '#22c55e',
};

function WorkflowNodeComponent({ id, data, selected }: NodeProps<Node<WorkflowNodeData>>) {
  const { updateNodeData } = useContext(WorkflowNodeActionsContext);
  const workflowType = data.workflowType || 'requirement';
  const config = WORKFLOW_TYPE_CONFIG[workflowType];
  const isInput = workflowType === 'input';
  const isOutput = workflowType === 'output';
  const isAgent = workflowType === 'agent';
  const isFocused = (data as Record<string, unknown>).isFocused as boolean;

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
        <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />
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
              className="w-full text-xs border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
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
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />
      )}
    </div>
  );
}

export const workflowNodeTypes = {
  workflowInput: WorkflowNodeComponent,
  workflowRequirement: WorkflowNodeComponent,
  workflowAgent: WorkflowNodeComponent,
  workflowCondition: WorkflowNodeComponent,
  workflowOutput: WorkflowNodeComponent,
};

export function getDefaultNodeData(workflowType: WorkflowNodeType): WorkflowNodeData {
  return {
    label: WORKFLOW_TYPE_CONFIG[workflowType].label,
    workflowType,
    inputText: '',
    agentType: workflowType === 'agent' ? 'review' : undefined,
  };
}

export function migrateLegacyNode(node: Node): Node {
  const oldType = node.type;
  let workflowType: WorkflowNodeType = 'requirement';

  if (oldType === 'input') {
    workflowType = 'input';
  } else if (oldType === 'output') {
    workflowType = 'output';
  }

  const existingData = node.data || {};
  const hasWorkflowType = 'workflowType' in existingData && existingData.workflowType;

  if (hasWorkflowType) {
    const wt = existingData.workflowType as WorkflowNodeType;
    return {
      ...node,
      type: getReactFlowNodeType(wt),
      data: {
        ...existingData,
        workflowType: wt,
        inputText: existingData.inputText || '',
        agentType: existingData.agentType || (wt as string === 'agent' ? 'review' : undefined),
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
    } as WorkflowNodeData,
  };
}
