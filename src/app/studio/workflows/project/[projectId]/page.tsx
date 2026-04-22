'use client';
import React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow, Background, Controls,
  type Node, type Edge,
  type Connection,
  type ReactFlowInstance,
  type XYPosition,
  applyEdgeChanges, applyNodeChanges,
  EdgeChange, NodeChange, addEdge,
  MiniMap, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/store/workflowStore';
import { HistoryOperationType, WorkflowNodeType, WorkflowNodeData, WorkflowRunPayload, AgentType } from '@/types';
import {
  WorkflowNodeActionsContext,
  workflowNodeTypes,
  WORKFLOW_TYPE_OPTIONS,
  DEFAULT_NODE_COLORS,
  getReactFlowNodeType,
  getWorkflowTypeFromReactFlowNode,
  getDefaultNodeData,
  migrateLegacyNode,
  BRANCH_TRUE_SOURCE_HANDLE_ID,
  BRANCH_FALSE_SOURCE_HANDLE_ID,
  TEMP_SOURCE_HANDLE_ID,
  TEMP_TARGET_HANDLE_ID,
} from '@/components/workflow/WorkflowNodes';

type AddNodeDraft = {
  label: string;
  workflowType: WorkflowNodeType;
  color: string;
};

type GraphSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

const EDGE_INSERT_DISTANCE_THRESHOLD = 36;

const createDefaultDraft = (): AddNodeDraft => ({
  label: '',
  workflowType: 'requirement',
  color: '#8b5cf6',
});

type TemplateNodeSeed = {
  id: string;
  workflowType: WorkflowNodeType;
  label: string;
  inputText: string;
  agentType?: AgentType;
  x: number;
  y: number;
};

type TemplateEdgeSeed = {
  source: string;
  target: string;
  label?: string;
  sourceSide?: 'left' | 'right' | 'top' | 'bottom';
  targetSide?: 'left' | 'right' | 'top' | 'bottom';
};

const REVIEW_LOOP_TEMPLATE_NODES: TemplateNodeSeed[] = [
  { id: 'tpl-input', workflowType: 'input', label: '输入(预期的页面)', inputText: '一个简洁的欢迎页面', x: 0, y: 0 },
  { id: 'tpl-requirement', workflowType: 'requirement', label: '对页面的详细要求', inputText: '极致的简洁感与现代美', x: 260, y: 0 },
  { id: 'tpl-design', workflowType: 'agent', label: '智能体', inputText: '针对要求设计页面', agentType: 'design', x: 520, y: 0 },
  { id: 'tpl-review', workflowType: 'agent', label: '智能体', inputText: '针对输入的设计/构建进行百分制评分, 分析是否存在可优化项', agentType: 'review', x: 840, y: 0 },
  { id: 'tpl-design-branch', workflowType: 'branch', label: '分支', inputText: '设计评分大于等于90', x: 760, y: -120 },
  { id: 'tpl-build', workflowType: 'agent', label: '智能体', inputText: '针对输入的设计进行页面构建', agentType: 'build', x: 1130, y: -120 },
  { id: 'tpl-build-branch', workflowType: 'branch', label: '分支', inputText: '构建评分大于等于90', x: 1030, y: 120 },
  { id: 'tpl-output', workflowType: 'output', label: '输出', inputText: '', x: 1350, y: 120 },
];

const REVIEW_LOOP_TEMPLATE_EDGES: TemplateEdgeSeed[] = [
  { source: 'tpl-input', target: 'tpl-requirement', sourceSide: 'right', targetSide: 'left' },
  { source: 'tpl-requirement', target: 'tpl-design', sourceSide: 'right', targetSide: 'left' },
  { source: 'tpl-design', target: 'tpl-review', sourceSide: 'right', targetSide: 'left' },
  { source: 'tpl-review', target: 'tpl-design-branch', sourceSide: 'top', targetSide: 'bottom' },
  { source: 'tpl-design-branch', target: 'tpl-design', label: '分支不成立', sourceSide: 'left', targetSide: 'top' },
  { source: 'tpl-design-branch', target: 'tpl-build', label: '分支成立', sourceSide: 'right', targetSide: 'top' },
  { source: 'tpl-build', target: 'tpl-review', sourceSide: 'left', targetSide: 'right' },
  { source: 'tpl-review', target: 'tpl-build-branch', sourceSide: 'bottom', targetSide: 'top' },
  { source: 'tpl-build-branch', target: 'tpl-build', label: '分支不成立', sourceSide: 'left', targetSide: 'bottom' },
  { source: 'tpl-build-branch', target: 'tpl-output', label: '分支成立', sourceSide: 'right', targetSide: 'left' },
];

function buildReviewLoopTemplateGraph(anchor: XYPosition): GraphSnapshot {
  const stamp = Date.now();
  const nodeInputHandles = new Map<string, string[]>();
  const nodeOutputHandles = new Map<string, string[]>();
  for (const node of REVIEW_LOOP_TEMPLATE_NODES) {
    nodeInputHandles.set(node.id, []);
    nodeOutputHandles.set(node.id, []);
  }

  const makeTemplateHandleId = (
    prefix: 'in' | 'out',
    side: 'left' | 'right' | 'top' | 'bottom' | undefined,
    nodeId: string,
    index: number,
  ) => {
    const resolvedSide = side || (prefix === 'out' ? 'right' : 'left');
    return `${prefix}-${resolvedSide}-${nodeId}-${index}`;
  };

  const edges: Edge[] = REVIEW_LOOP_TEMPLATE_EDGES.map((edgeSeed, index) => {
    const sourceNode = REVIEW_LOOP_TEMPLATE_NODES.find((n) => n.id === edgeSeed.source);
    const sourceHandleList = nodeOutputHandles.get(edgeSeed.source) || [];
    const targetHandleList = nodeInputHandles.get(edgeSeed.target) || [];
    const sourceHandle = sourceNode?.workflowType === 'branch'
      ? (String(edgeSeed.label || '').includes('不成立') ? BRANCH_FALSE_SOURCE_HANDLE_ID : BRANCH_TRUE_SOURCE_HANDLE_ID)
      : makeTemplateHandleId('out', edgeSeed.sourceSide, edgeSeed.source, sourceHandleList.length + 1);
    const targetHandle = makeTemplateHandleId('in', edgeSeed.targetSide, edgeSeed.target, targetHandleList.length + 1);
    if (!sourceHandleList.includes(sourceHandle)) sourceHandleList.push(sourceHandle);
    targetHandleList.push(targetHandle);
    nodeOutputHandles.set(edgeSeed.source, sourceHandleList);
    nodeInputHandles.set(edgeSeed.target, targetHandleList);

    return {
      id: `tpl-edge-${stamp}-${index}`,
      source: edgeSeed.source,
      target: edgeSeed.target,
      label: edgeSeed.label,
      sourceHandle,
      targetHandle,
    };
  });

  const nodes: Node[] = REVIEW_LOOP_TEMPLATE_NODES.map((seed) => {
    const defaultData = getDefaultNodeData(seed.workflowType);

    return {
      id: seed.id,
      type: getReactFlowNodeType(seed.workflowType),
      position: { x: anchor.x + seed.x, y: anchor.y + seed.y },
      style: {
        backgroundColor: DEFAULT_NODE_COLORS[seed.workflowType],
        color: getInvertedTextColor(DEFAULT_NODE_COLORS[seed.workflowType]),
      },
      data: {
        ...defaultData,
        label: seed.label,
        inputText: seed.inputText,
        agentType: seed.agentType,
        inputHandles: nodeInputHandles.get(seed.id) || [],
        outputHandles: seed.workflowType === 'branch'
          ? [BRANCH_TRUE_SOURCE_HANDLE_ID, BRANCH_FALSE_SOURCE_HANDLE_ID]
          : (nodeOutputHandles.get(seed.id) || []),
      } satisfies WorkflowNodeData,
    };
  });

  return { nodes, edges };
}

const getInvertedTextColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

const nodeColor = (node: Node) => {
  const wt = (node.data as Record<string, unknown>)?.workflowType as WorkflowNodeType | undefined;
  if (wt && DEFAULT_NODE_COLORS[wt]) return DEFAULT_NODE_COLORS[wt];
  return `${node.style?.backgroundColor ?? 'lightgray'}`;
};

function validateWorkflow(nodes: Node[], edges: Edge[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const getNodeData = (n: Node) => n.data as WorkflowNodeData;

  const inputNodes = nodes.filter(n => getNodeData(n)?.workflowType === 'input');
  const agentNodes = nodes.filter(n => getNodeData(n)?.workflowType === 'agent');
  const outputNodes = nodes.filter(n => getNodeData(n)?.workflowType === 'output');

  if (inputNodes.length === 0) errors.push('缺少输入节点(预期的页面)');
  if (inputNodes.length > 1) errors.push('只能有一个输入节点');
  if (agentNodes.length === 0) errors.push('至少需要一个智能体节点');
  if (outputNodes.length === 0) errors.push('缺少输出节点');

  for (const node of nodes) {
    const data = getNodeData(node);
    if (!data) continue;
    if (data.workflowType !== 'output' && !data.inputText?.trim()) {
      errors.push(`节点 "${data.label || node.id}" 的输入框不能为空`);
    }
  }

  for (const inputNode of inputNodes) {
    const incomingEdges = edges.filter(e => e.target === inputNode.id);
    if (incomingEdges.length > 0) errors.push('输入节点不应有入边');
  }

  for (const outputNode of outputNodes) {
    const outgoingEdges = edges.filter(e => e.source === outputNode.id);
    if (outgoingEdges.length > 0) errors.push('输出节点不应有出边');
  }

  for (const node of nodes) {
    const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
    if (connectedEdges.length === 0) {
      const data = getNodeData(node);
      errors.push(`节点 "${data?.label || node.id}" 是孤立的，未连接到任何边`);
    }
  }

  const visited = new Set<string>();
  const queue = inputNodes.map(n => n.id);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }
  const outputIds = new Set(outputNodes.map(n => n.id));
  for (const outputId of outputIds) {
    if (!visited.has(outputId)) {
      errors.push('输出节点不可从输入节点到达，请检查连接');
    }
  }

  const nodeTypeMap = new Map<string, WorkflowNodeType>(
    nodes.map((n) => [n.id, getNodeData(n)?.workflowType || 'requirement']),
  );
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);

  const visitState = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  let hasInvalidCycle = false;

  const dfs = (nodeId: string) => {
    if (hasInvalidCycle) return;
    visitState.set(nodeId, 1);
    stack.push(nodeId);

    for (const nextId of adjacency.get(nodeId) || []) {
      if (hasInvalidCycle) break;

      if (nextId === nodeId && !['branch', 'condition'].includes(nodeTypeMap.get(nodeId) || '')) {
        hasInvalidCycle = true;
        break;
      }

      const nextState = visitState.get(nextId) || 0;
      if (nextState === 0) {
        dfs(nextId);
      } else if (nextState === 1) {
        const cycleStart = stack.lastIndexOf(nextId);
        const cycleNodeIds = cycleStart >= 0 ? stack.slice(cycleStart) : [nextId];
        const hasBranchNode = cycleNodeIds.some((id) => ['branch', 'condition'].includes(nodeTypeMap.get(id) || ''));
        if (!hasBranchNode) {
          hasInvalidCycle = true;
          break;
        }
      }
    }

    stack.pop();
    visitState.set(nodeId, 2);
  };

  for (const node of nodes) {
    if ((visitState.get(node.id) || 0) === 0) dfs(node.id);
    if (hasInvalidCycle) break;
  }

  if (hasInvalidCycle) {
    errors.push('检测到不包含分支节点的循环依赖，仅允许通过分支节点形成循环重试');
  }

  return { valid: errors.length === 0, errors };
}

function buildWorkflowPayload(nodes: Node[], edges: Edge[]): WorkflowRunPayload {
  const getNodeData = (n: Node) => n.data as WorkflowNodeData;
  return {
    nodes: nodes.map(n => {
      const data = getNodeData(n);
      return {
        id: n.id,
        type: data?.workflowType || 'requirement',
        label: data?.label || '',
        inputText: data?.inputText || '',
        agentType: data?.agentType,
      };
    }),
    edges: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: typeof e.label === 'string' ? e.label : undefined,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  };
}

const ProjectPage = () => {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const {
    currentProject,
    initProject,
    setTopic,
    addHistoryOperation,
    updateGraph,
    saveToDB,
    isAutoSaveEnabled,
    setAutoSaveEnabled,
    loadFromDB,
    goToHistoryIndex,
    currentHistoryIndex,
  } = useWorkflowStore();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [historySnapshotsLocal, setHistorySnapshotsLocal] = useState<GraphSnapshot[]>([]);
  const [currentHistoryIndexLocal, setCurrentHistoryIndexLocal] = useState<number>(-1);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [lastContextPosition, setLastContextPosition] = useState<XYPosition>({ x: 0, y: 0 });
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    type: 'pane' | 'node' | 'edge';
    id: string | null;
  }>({ type: 'pane', id: null });

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string>('');
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [colorDraft, setColorDraft] = useState<string>('#8b5cf6');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [saveDraftDialogOpen, setSaveDraftDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [queuedDrafts, setQueuedDrafts] = useState<AddNodeDraft[]>([]);
  const [editingQueuedDraftIndex, setEditingQueuedDraftIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<AddNodeDraft>(createDefaultDraft);

  const [isRunning, setIsRunning] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string>('');
  const [runResult, setRunResult] = useState<string>('');

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const abortControllerRef = useRef<AbortController | null>(null);

  const dragSessionRef = useRef<{
    nodeId: string;
    startPosition: XYPosition;
    snapshot: GraphSnapshot;
  } | null>(null);
  const initializedProjectIdRef = useRef<string | null>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  useEffect(() => {
    if (projectId) initProject(projectId);
  }, [projectId, initProject]);

  useEffect(() => {
    if (!currentProject || currentProject.id !== projectId) return;
    if (initializedProjectIdRef.current === currentProject.id) return;

    initializedProjectIdRef.current = currentProject.id;
    const projectNodes = currentProject.nodes.map(migrateLegacyNode);
    const projectEdges = currentProject.edges;

    queueMicrotask(() => {
      setNodes(projectNodes);
      setEdges(projectEdges);
    });
    nodesRef.current = projectNodes;
    edgesRef.current = projectEdges;

    const baseSnapshot: GraphSnapshot = {
      nodes: structuredClone(projectNodes),
      edges: structuredClone(projectEdges),
    };
    const operationCount = currentProject.historyOperations.length;
    const snapshots =
      Array.isArray(currentProject.historySnapshots) &&
      currentProject.historySnapshots.length === operationCount + 1
        ? currentProject.historySnapshots.map((snapshot) => ({
          nodes: structuredClone(snapshot.nodes).map(migrateLegacyNode),
          edges: structuredClone(snapshot.edges),
        }))
        : [baseSnapshot];
    const index = operationCount - 1;

    queueMicrotask(() => {
      setHistorySnapshotsLocal(snapshots);
      setCurrentHistoryIndexLocal(index);
      goToHistoryIndex(index);
    });
  }, [currentProject, projectId, goToHistoryIndex]);

  useEffect(() => {
    initializedProjectIdRef.current = null;
  }, [projectId]);

  const createSnapshot = useCallback((): GraphSnapshot => ({
    nodes: structuredClone(nodesRef.current),
    edges: structuredClone(edgesRef.current),
  }), []);

  const restoreSnapshotAt = useCallback((targetHistoryIndex: number, syncStore: boolean = true) => {
    const targetSnapshot = historySnapshotsLocal[targetHistoryIndex + 1];
    if (!targetSnapshot) return;

    const restoredNodes = structuredClone(targetSnapshot.nodes).map(migrateLegacyNode);
    const restoredEdges = structuredClone(targetSnapshot.edges);
    nodesRef.current = restoredNodes;
    edgesRef.current = restoredEdges;
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setCurrentHistoryIndexLocal(targetHistoryIndex);

    if (syncStore) goToHistoryIndex(targetHistoryIndex);
  }, [historySnapshotsLocal, goToHistoryIndex]);

  const pushHistoryEntry = useCallback((
    type: HistoryOperationType,
    description: string,
    affectedIds?: string[],
    snapshotOverride?: GraphSnapshot,
  ) => {
    const nextHistoryIndex = currentHistoryIndexLocal + 1;
    const snapshotToAppend = snapshotOverride ?? createSnapshot();

    setHistorySnapshotsLocal((prev) => {
      const keepCount = Math.max(1, currentHistoryIndexLocal + 2);
      const base = prev.length ? prev.slice(0, keepCount) : [createSnapshot()];
      return [
        ...base,
        {
          nodes: structuredClone(snapshotToAppend.nodes),
          edges: structuredClone(snapshotToAppend.edges),
        },
      ];
    });

    setCurrentHistoryIndexLocal(nextHistoryIndex);
    addHistoryOperation(type, description, affectedIds, {
      nodes: structuredClone(snapshotToAppend.nodes),
      edges: structuredClone(snapshotToAppend.edges),
    });
    goToHistoryIndex(nextHistoryIndex);
  }, [addHistoryOperation, createSnapshot, currentHistoryIndexLocal, goToHistoryIndex]);

  useEffect(() => {
    if (currentHistoryIndex === currentHistoryIndexLocal) return;
    queueMicrotask(() => {
      restoreSnapshotAt(currentHistoryIndex, false);
    });
  }, [currentHistoryIndex, currentHistoryIndexLocal, restoreSnapshotAt]);

  const applyGraphUpdate = useCallback((
    updater: (current: GraphSnapshot) => GraphSnapshot,
    options?: { recordHistory?: boolean; operationType?: HistoryOperationType; description?: string; affectedIds?: string[] },
  ) => {
    const recordHistory = options?.recordHistory ?? true;
    const current: GraphSnapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };
    const next = updater(current);

    if (next.nodes === current.nodes && next.edges === current.edges) return;

    nodesRef.current = next.nodes;
    edgesRef.current = next.edges;
    setNodes(next.nodes);
    setEdges(next.edges);

    updateGraph(next.nodes, next.edges, false);

    if (recordHistory && options?.operationType) {
      pushHistoryEntry(
        options.operationType,
        options.description || '',
        options.affectedIds,
        {
          nodes: structuredClone(next.nodes),
          edges: structuredClone(next.edges),
        },
      );
    }
  }, [updateGraph, pushHistoryEntry]);

  const updateNodeData = useCallback((nodeId: string, updates: Partial<WorkflowNodeData>) => {
    setNodes(prevNodes => {
      const nextNodes = prevNodes.map(node => {
        if (node.id !== nodeId) return node;
        return { ...node, data: { ...node.data, ...updates } };
      });
      nodesRef.current = nextNodes;
      updateGraph(nextNodes, edgesRef.current, false);
      return nextNodes;
    });
  }, [updateGraph]);

  const startDragHistory = useCallback((node: Node) => {
    dragSessionRef.current = {
      nodeId: node.id,
      startPosition: { ...node.position },
      snapshot: createSnapshot(),
    };
  }, [createSnapshot]);

  const commitDragHistory = useCallback((node: Node) => {
    const session = dragSessionRef.current;
    dragSessionRef.current = null;
    if (!session || session.nodeId !== node.id) return;
    const moved = session.startPosition.x !== node.position.x || session.startPosition.y !== node.position.y;
    if (!moved) return;
    pushHistoryEntry('node_moved', 'Node Moved', [node.id], {
      nodes: structuredClone(nodesRef.current),
      edges: structuredClone(edgesRef.current),
    });
  }, [pushHistoryEntry]);

  const resetAddDialogState = useCallback(() => {
    setQueuedDrafts([]);
    setEditingQueuedDraftIndex(null);
    setDraft(createDefaultDraft());
  }, []);

  const closeAddDialog = useCallback(() => {
    setAddDialogOpen(false);
    resetAddDialogState();
  }, [resetAddDialogState]);

  const screenToFlowPosition = useCallback((clientX: number, clientY: number): XYPosition => {
    if (!reactFlowInstance) return { x: clientX, y: clientY };
    return reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
  }, [reactFlowInstance]);

  const pointToSegmentDistance = useCallback(
    (p: XYPosition, a: XYPosition, b: XYPosition) => {
      const abx = b.x - a.x; const aby = b.y - a.y;
      const apx = p.x - a.x; const apy = p.y - a.y;
      const abLenSq = abx * abx + aby * aby;
      if (abLenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
      const closest = { x: a.x + abx * t, y: a.y + aby * t };
      return Math.hypot(p.x - closest.x, p.y - closest.y);
    }, [],
  );

  const getNodeCenter = useCallback((node: Node): XYPosition => {
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    return { x: node.position.x + width / 2, y: node.position.y + height / 2 };
  }, []);

  const findClosestEdgeForNode = useCallback((draggedNode: Node) => {
    const draggedCenter = getNodeCenter(draggedNode);
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    let matchedEdge: Edge | null = null;
    let minDistance = Number.POSITIVE_INFINITY;
    for (const edge of edges) {
      // 避免把与当前拖拽节点直接相连的边进行“拆分插入”，否则会产生自环边（如 a->a）
      if (edge.source === draggedNode.id || edge.target === draggedNode.id) continue;
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) continue;
      const sourceCenter = getNodeCenter(sourceNode);
      const targetCenter = getNodeCenter(targetNode);
      const distance = pointToSegmentDistance(draggedCenter, sourceCenter, targetCenter);
      if (distance < minDistance) { minDistance = distance; matchedEdge = edge; }
    }
    if (minDistance > EDGE_INSERT_DISTANCE_THRESHOLD) return null;
    return matchedEdge;
  }, [edges, getNodeCenter, nodes, pointToSegmentDistance]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      const hasPositionChange = changes.some((change) => change.type === 'position');
      applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
        nodes: applyNodeChanges(changes, currentNodes),
        edges: currentEdges,
      }), { recordHistory: !hasPositionChange });
    }, [applyGraphUpdate],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
        nodes: currentNodes,
        edges: applyEdgeChanges(changes, currentEdges),
      }));
    }, [applyGraphUpdate],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
        let resolvedSourceHandle = params.sourceHandle || null;
        let resolvedTargetHandle = params.targetHandle || null;
        let edgeLabel: string | undefined;

        const sourceNode = currentNodes.find((node) => node.id === params.source);
        const sourceNodeType = (sourceNode?.data as WorkflowNodeData | undefined)?.workflowType;
        if (sourceNodeType === 'branch' || sourceNodeType === 'condition') {
          const usedTrue = currentEdges.some((edge) => edge.source === params.source && edge.sourceHandle === BRANCH_TRUE_SOURCE_HANDLE_ID);

          if (!resolvedSourceHandle || resolvedSourceHandle === TEMP_SOURCE_HANDLE_ID) {
            resolvedSourceHandle = !usedTrue
              ? BRANCH_TRUE_SOURCE_HANDLE_ID
              : BRANCH_FALSE_SOURCE_HANDLE_ID;
          }

          if (resolvedSourceHandle === BRANCH_TRUE_SOURCE_HANDLE_ID) edgeLabel = '分支成立';
          else if (resolvedSourceHandle === BRANCH_FALSE_SOURCE_HANDLE_ID) edgeLabel = '分支不成立';
        }

        if (!resolvedSourceHandle || resolvedSourceHandle === TEMP_SOURCE_HANDLE_ID) {
          resolvedSourceHandle = TEMP_SOURCE_HANDLE_ID;
        }
        if (!resolvedTargetHandle || resolvedTargetHandle === TEMP_TARGET_HANDLE_ID) {
          resolvedTargetHandle = TEMP_TARGET_HANDLE_ID;
        }

        return {
          nodes: currentNodes,
          edges: addEdge({
            ...params,
            label: edgeLabel,
            sourceHandle: resolvedSourceHandle,
            targetHandle: resolvedTargetHandle,
          }, currentEdges),
        };
      }, { operationType: 'edge_added', description: 'Edge Added' });
    }, [applyGraphUpdate],
  );

  const importReviewLoopTemplate = useCallback(() => {
    const templateGraph = buildReviewLoopTemplateGraph(lastContextPosition);
    applyGraphUpdate(() => ({
      nodes: templateGraph.nodes,
      edges: templateGraph.edges,
    }), {
      operationType: 'nodes_added',
      description: 'Template Imported (Design-Review-Build Loop)',
      affectedIds: templateGraph.nodes.map((n) => n.id),
    });
    setRunStatus('模板已导入：设计-审查-构建循环');
  }, [applyGraphUpdate, lastContextPosition]);

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuTarget({ type: 'pane', id: null });
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  const onNodeContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>, node: Node) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuTarget({ type: 'node', id: node.id });
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  const onEdgeContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>, edge: Edge) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuTarget({ type: 'edge', id: edge.id });
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    startDragHistory(node);
  }, [startDragHistory]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, draggedNode: Node) => {
    commitDragHistory(draggedNode);

    const wt = getWorkflowTypeFromReactFlowNode(draggedNode.type);
    if (wt === 'input' || wt === 'output') return;

    const closestEdge = findClosestEdgeForNode(draggedNode);
    if (!closestEdge) return;

    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const targetEdge = currentEdges.find((edge) => edge.id === closestEdge.id);
      if (!targetEdge) return { nodes: currentNodes, edges: currentEdges };
      if (targetEdge.source === draggedNode.id || targetEdge.target === draggedNode.id) {
        return { nodes: currentNodes, edges: currentEdges };
      }

      const splitEdgeOne: Edge = {
        ...targetEdge,
        id: `${targetEdge.source}-${draggedNode.id}-${Date.now()}-left`,
        target: draggedNode.id,
      };
      const splitEdgeTwo: Edge = {
        ...targetEdge,
        id: `${draggedNode.id}-${targetEdge.target}-${Date.now()}-right`,
        source: draggedNode.id,
      };

      return {
        nodes: currentNodes,
        edges: currentEdges
          .filter((edge) => edge.id !== targetEdge.id)
          .concat(splitEdgeOne, splitEdgeTwo),
      };
    }, { recordHistory: false, operationType: 'edge_inserted', description: 'Edge Inserted' });
  }, [applyGraphUpdate, commitDragHistory, findClosestEdgeForNode]);

  const appendCurrentDraftToQueue = useCallback(() => {
    const normalizedLabel = draft.label.trim();
    if (!normalizedLabel) return false;
    setQueuedDrafts((prev) => {
      if (editingQueuedDraftIndex === null) {
        return [...prev, { ...draft, label: normalizedLabel }];
      }
      return prev.map((item, idx) => (idx === editingQueuedDraftIndex ? { ...draft, label: normalizedLabel } : item));
    });
    setEditingQueuedDraftIndex(null);
    setDraft(createDefaultDraft());
    return true;
  }, [draft, editingQueuedDraftIndex]);

  const AddNodes = () => { setAddDialogOpen(true); };
  const ContinueAddNodes = () => { appendCurrentDraftToQueue(); };

  const ConfirmAddNodes = () => {
    const normalizedLabel = draft.label.trim();
    const allDrafts = (() => {
      if (!normalizedLabel) return [...queuedDrafts];
      if (editingQueuedDraftIndex !== null) {
        return queuedDrafts.map((item, idx) => (idx === editingQueuedDraftIndex ? { ...draft, label: normalizedLabel } : item));
      }
      return [...queuedDrafts, { ...draft, label: normalizedLabel }];
    })();

    if (!allDrafts.length) { closeAddDialog(); return; }

    const newNodeIds = allDrafts.map((_, index) => `node-${Date.now()}-${index}`);
    const operationType: HistoryOperationType = allDrafts.length > 1 ? 'nodes_added' : 'node_added';

    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
      nodes: [
        ...currentNodes,
        ...allDrafts.map((item, index) => ({
          id: newNodeIds[index],
          data: getDefaultNodeData(item.workflowType),
          type: getReactFlowNodeType(item.workflowType),
          position: {
            x: lastContextPosition.x + (index % 3) * 260,
            y: lastContextPosition.y + Math.floor(index / 3) * 120,
          },
          style: {
            backgroundColor: item.color,
            color: getInvertedTextColor(item.color),
          },
        })),
      ],
      edges: currentEdges,
    }), { operationType, description: allDrafts.length > 1 ? `Nodes Added (${allDrafts.length})` : 'Node Added', affectedIds: newNodeIds });

    closeAddDialog();
  };

  const DeleteNodes = () => {
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
    let nodeIdsToDelete = new Set<string>();
    if (contextMenuTarget.type === 'node' && contextMenuTarget.id) {
      nodeIdsToDelete = selectedNodeIds.has(contextMenuTarget.id) ? selectedNodeIds : new Set([contextMenuTarget.id]);
    } else {
      nodeIdsToDelete = selectedNodeIds;
    }
    if (!nodeIdsToDelete.size) return;
    const operationType: HistoryOperationType = nodeIdsToDelete.size > 1 ? 'nodes_deleted' : 'node_deleted';
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
      nodes: currentNodes.filter((node) => !nodeIdsToDelete.has(node.id)),
      edges: currentEdges.filter((edge) => !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)),
    }), { operationType, description: nodeIdsToDelete.size > 1 ? `Nodes Deleted (${nodeIdsToDelete.size})` : 'Node Deleted', affectedIds: Array.from(nodeIdsToDelete) });
  };

  const DeleteEdges = () => {
    const selectedEdgeIds = new Set(edgesRef.current.filter((e) => e.selected).map((e) => e.id));
    let edgeIdsToDelete = new Set<string>();
    if (contextMenuTarget.type === 'edge' && contextMenuTarget.id) {
      edgeIdsToDelete = selectedEdgeIds.has(contextMenuTarget.id) ? selectedEdgeIds : new Set([contextMenuTarget.id]);
    } else {
      edgeIdsToDelete = selectedEdgeIds;
    }
    if (!edgeIdsToDelete.size) return;
    const operationType: HistoryOperationType = edgeIdsToDelete.size > 1 ? 'edges_deleted' : 'edge_deleted';
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
      nodes: currentNodes,
      edges: currentEdges.filter((edge) => !edgeIdsToDelete.has(edge.id)),
    }), { operationType, description: edgeIdsToDelete.size > 1 ? `Edges Deleted (${edgeIdsToDelete.size})` : 'Edge Deleted', affectedIds: Array.from(edgeIdsToDelete) });
  };

  const OpenLabelDialog = () => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    if (selectedNodes.length === 1 && selectedEdges.length === 0) {
      setLabelDraft((selectedNodes[0].data.label as string) || '');
      setLabelDialogOpen(true);
    } else if (selectedEdges.length === 1 && selectedNodes.length === 0) {
      setLabelDraft((selectedEdges[0].label as string) || '');
      setLabelDialogOpen(true);
    }
  };

  const ConfirmChangeLabel = () => {
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const selectedNodes = currentNodes.filter((n) => n.selected);
      const selectedEdges = currentEdges.filter((e) => e.selected);
      if (selectedNodes.length === 1) {
        return {
          nodes: currentNodes.map((n) =>
            n.id === selectedNodes[0].id ? { ...n, data: { ...n.data, label: labelDraft } } : n
          ),
          edges: currentEdges,
        };
      } else if (selectedEdges.length === 1) {
        return {
          nodes: currentNodes,
          edges: currentEdges.map((e) =>
            e.id === selectedEdges[0].id ? { ...e, label: labelDraft } : e
          ),
        };
      }
      return { nodes: currentNodes, edges: currentEdges };
    }, { operationType: 'label_changed', description: 'Label Changed' });
    setLabelDialogOpen(false);
  };

  const OpenColorDialog = () => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    if (selectedNodes.length > 0) {
      setColorDraft(selectedNodes[0].style?.backgroundColor as string || '#8b5cf6');
    } else if (selectedEdges.length > 0) {
      setColorDraft(selectedEdges[0].style?.stroke as string || '#8b5cf6');
    }
    setColorDialogOpen(true);
  };

  const ConfirmChangeColor = () => {
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const selectedNodeIds = new Set(currentNodes.filter((n) => n.selected).map((n) => n.id));
      const selectedEdgeIds = new Set(currentEdges.filter((e) => e.selected).map((e) => e.id));
      return {
        nodes: currentNodes.map((n) =>
          selectedNodeIds.has(n.id)
            ? { ...n, style: { ...n.style, backgroundColor: colorDraft, color: getInvertedTextColor(colorDraft) } }
            : n
        ),
        edges: currentEdges.map((e) =>
          selectedEdgeIds.has(e.id) ? { ...e, style: { ...e.style, stroke: colorDraft } } : e
        ),
      };
    }, { operationType: 'color_changed', description: 'Color Changed' });
    setColorDialogOpen(false);
  };

  const ChangeNodeTypes = (workflowType: WorkflowNodeType) => {
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const selectedNodeIds = new Set(currentNodes.filter((n) => n.selected).map((n) => n.id));
      return {
        nodes: currentNodes.map((n) => {
          if (!selectedNodeIds.has(n.id)) return n;
          const existingData = n.data as WorkflowNodeData;
          return {
            ...n,
            type: getReactFlowNodeType(workflowType),
            data: {
              ...existingData,
              workflowType,
              agentType: workflowType === 'agent' ? (existingData.agentType || 'review') : undefined,
            },
          };
        }),
        edges: currentEdges,
      };
    }, { operationType: 'type_changed', description: 'Type Changed' });
  };

  const Back = useCallback(() => {
    if (currentHistoryIndexLocal < 0) return;
    restoreSnapshotAt(currentHistoryIndexLocal - 1);
  }, [currentHistoryIndexLocal, restoreSnapshotAt]);

  const Forward = useCallback(() => {
    const maxHistoryIndex = (currentProject?.historyOperations.length ?? 0) - 1;
    if (currentHistoryIndexLocal >= maxHistoryIndex) return;
    restoreSnapshotAt(currentHistoryIndexLocal + 1);
  }, [currentProject?.historyOperations.length, currentHistoryIndexLocal, restoreSnapshotAt]);

  const OpenRenameDialog = useCallback(() => {
    if (currentProject) { setRenameDraft(currentProject.topic); setRenameDialogOpen(true); }
  }, [currentProject]);

  const ConfirmRename = useCallback(() => {
    setTopic(renameDraft);
    setRenameDialogOpen(false);
  }, [renameDraft, setTopic]);

  const handleAutoSaveChange = useCallback((checked: boolean | 'indeterminate') => {
    setAutoSaveEnabled(checked === true);
  }, [setAutoSaveEnabled]);

  useEffect(() => {
    return () => { setAutoSaveEnabled(false); };
  }, [setAutoSaveEnabled]);

  const handleBack = useCallback(async () => {
    const existingProject = await loadFromDB(projectId);
    if (!existingProject) { setSaveDraftDialogOpen(true); }
    else { router.push('/studio/workflows'); }
  }, [projectId, loadFromDB, router]);

  const handleSaveDraft = useCallback(async () => {
    await saveToDB();
    setSaveDraftDialogOpen(false);
    router.push('/studio/workflows');
  }, [saveToDB, router]);

  const handleDiscardDraft = useCallback(() => {
    setSaveDraftDialogOpen(false);
    router.push('/studio/workflows');
  }, [router]);

  const runWorkflow = useCallback(async () => {
    const validation = validateWorkflow(nodesRef.current, edgesRef.current);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setValidationDialogOpen(true);
      return;
    }

    setIsRunning(true);
    setRunStatus('准备中...');
    setRunResult('');
    setFocusedNodeId(null);

    const payload = buildWorkflowPayload(nodesRef.current, edgesRef.current);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      const processSSELine = (line: string) => {
        const normalizedLine = line.replace(/\r$/, '');
        if (normalizedLine.startsWith('event: ')) {
          currentEvent = normalizedLine.slice(7).trim();
          return;
        }

        if (!normalizedLine.startsWith('data: ')) return;

        try {
          const data = JSON.parse(normalizedLine.slice(6));
          if (currentEvent === 'status') {
            if (data.type === 'building') setRunStatus(data.message);
            else if (data.type === 'focus') setFocusedNodeId(data.nodeId);
            else if (data.type === 'branch') {
              const branchText = data.branch || data.condition || '未命名分支';
              setRunStatus(`分支: ${branchText} - ${data.taken ? '进入' : '跳过'}`);
            }
            else if (data.type === 'agent_output') setRunStatus(`智能体输出: ${data.output?.slice(0, 80)}...`);
          } else if (currentEvent === 'done') {
            const finalResult = typeof data.result === 'string' ? data.result : '工作流执行完成';
            setRunStatus('工作流执行完成');
            setRunResult(finalResult);
            setFocusedNodeId(null);
          } else if (currentEvent === 'error') {
            const errorMessage = `错误: ${data.message || '未知错误'}`;
            setRunStatus(errorMessage);
            setRunResult(errorMessage);
            setFocusedNodeId(null);
          }
        } catch { /* ignore parse errors */ }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processSSELine(line);
        }
      }

      const finalChunk = decoder.decode();
      if (finalChunk) {
        buffer += finalChunk;
      }
      if (buffer.trim()) {
        for (const line of buffer.split('\n')) {
          processSSELine(line);
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const failedMessage = `执行失败: ${(error as Error).message}`;
        setRunStatus(failedMessage);
        setRunResult(failedMessage);
      }
    } finally {
      setIsRunning(false);
      abortControllerRef.current = null;
    }
  }, []);

  const stopWorkflow = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setFocusedNodeId(null);
    setRunStatus('已手动停止');
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const hasSelectedNodes = nodes.some(n => n.selected);
  const hasSelectedEdges = edges.some(e => e.selected);
  const selectedNodesCount = nodes.filter(n => n.selected).length;
  const selectedEdgesCount = edges.filter(e => e.selected).length;

  const canDeleteNodes = contextMenuTarget.type === 'node' || hasSelectedNodes;
  const canDeleteEdges = contextMenuTarget.type === 'edge' || hasSelectedEdges;

  let canChangeLabel = false;
  if (contextMenuTarget.type === 'node') {
    const isTargetSelected = nodes.find(n => n.id === contextMenuTarget.id)?.selected;
    canChangeLabel = isTargetSelected ? selectedNodesCount === 1 : true;
  } else if (contextMenuTarget.type === 'edge') {
    const isTargetSelected = edges.find(e => e.id === contextMenuTarget.id)?.selected;
    canChangeLabel = isTargetSelected ? selectedEdgesCount === 1 : true;
  } else {
    canChangeLabel = (selectedNodesCount === 1 && selectedEdgesCount === 0) || (selectedNodesCount === 0 && selectedEdgesCount === 1);
  }

  const canChangeColor = contextMenuTarget.type === 'node' || hasSelectedNodes;
  const canChangeType = contextMenuTarget.type === 'node' || hasSelectedNodes;
  const maxHistoryIndex = (currentProject?.historyOperations.length ?? 0) - 1;

  const displayNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isFocused: node.id === focusedNodeId,
      },
    }));
  }, [nodes, focusedNodeId]);

  const displayEdges = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      labelStyle: edge.label
        ? { fontSize: 11, fill: '#1e293b', fontWeight: 600 }
        : edge.labelStyle,
      labelBgStyle: edge.label
        ? { fill: '#ffffff', fillOpacity: 0.9 }
        : edge.labelBgStyle,
      labelBgPadding: edge.label ? ([4, 2] as [number, number]) : edge.labelBgPadding,
      labelBgBorderRadius: edge.label ? 4 : edge.labelBgBorderRadius,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
      style: {
        ...edge.style,
        stroke: edge.style?.stroke || '#64748b',
        strokeWidth: edge.style?.strokeWidth || 1.5,
        ...(isRunning ? { strokeDasharray: '5 5' } : {}),
      },
      animated: isRunning,
    }));
  }, [edges, isRunning]);

  const draftTypeConfig = WORKFLOW_TYPE_OPTIONS.find(o => o.value === draft.workflowType);

  return (
    <div className='h-full w-full flex flex-col'>
      <div className='h-12 border-b bg-background flex items-center px-4 gap-2 shrink-0'>
        <div className='flex items-center gap-2'>
          <Button variant="ghost" size="sm" onClick={handleBack}>
            ← Back
          </Button>
          <span className='text-sm font-medium'>{currentProject?.topic || 'Unnamed Project'}</span>
        </div>
        <div className='flex items-center gap-3 ml-auto'>
          {!!runStatus && (
            <span className={isRunning ? 'text-xs text-orange-600 font-medium animate-pulse' : 'text-xs text-muted-foreground font-medium'}>{runStatus}</span>
          )}
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={stopWorkflow}>
              停止
            </Button>
          ) : (
            <Button variant="default" size="sm" onClick={runWorkflow} className="bg-green-600 hover:bg-green-700">
              ▶ 运行
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-save"
              checked={isAutoSaveEnabled}
              onCheckedChange={handleAutoSaveChange}
            />
            <label
              htmlFor="auto-save"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Auto Save
            </label>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">导入模板</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={importReviewLoopTemplate}>
                设计-审查-构建循环模板
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={OpenRenameDialog}>
            Rename
          </Button>
          <Button variant="ghost" size="sm" onClick={() => saveToDB()}>
            Save to Local DB
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={Back}
            disabled={currentHistoryIndexLocal < 0}
          >
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={Forward}
            disabled={currentHistoryIndexLocal >= maxHistoryIndex}
          >
            Redo
          </Button>
        </div>
      </div>

      <div className='flex-1 min-h-0'>
        <WorkflowNodeActionsContext.Provider value={{ updateNodeData }}>
          <ContextMenu>
            <ContextMenuTrigger className="w-full h-full">
              <ReactFlow
                nodes={displayNodes}
                edges={displayEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onPaneContextMenu={onPaneContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                onNodeDragStart={onNodeDragStart}
                onNodeDragStop={onNodeDragStop}
                onInit={setReactFlowInstance}
                nodeTypes={workflowNodeTypes}
                defaultEdgeOptions={{
                  markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
                  style: { stroke: '#64748b', strokeWidth: 1.5 },
                }}
                fitView
              >
                <Background />
                <Controls />
                <MiniMap nodeColor={nodeColor} />
              </ReactFlow>
            </ContextMenuTrigger>

            <ContextMenuContent>
              <ContextMenuItem onClick={AddNodes}>添加节点</ContextMenuItem>
              <ContextMenuItem onClick={DeleteNodes} disabled={!canDeleteNodes}>删除节点</ContextMenuItem>
              <ContextMenuItem onClick={DeleteEdges} disabled={!canDeleteEdges}>删除边</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={OpenLabelDialog} disabled={!canChangeLabel}>修改标签</ContextMenuItem>
              <ContextMenuItem onClick={OpenColorDialog} disabled={!canChangeColor}>修改颜色</ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger disabled={!canChangeType}>修改节点类型</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {WORKFLOW_TYPE_OPTIONS.map((opt) => (
                    <ContextMenuItem key={opt.value} onClick={() => ChangeNodeTypes(opt.value)}>
                      {opt.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={Back} disabled={currentHistoryIndexLocal < 0}>Back</ContextMenuItem>
              <ContextMenuItem onClick={Forward} disabled={currentHistoryIndexLocal >= maxHistoryIndex}>Forward</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </WorkflowNodeActionsContext.Provider>
      </div>

      {!!runResult && (
        <div className="border-t bg-background p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">运行结果</div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 text-xs leading-5">
            {runResult}
          </pre>
        </div>
      )}

      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改文字/标签</DialogTitle>
            <DialogDescription>修改当前选中项的显示文字。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>文字内容</Label>
            <Input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="请输入文字"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>取消</Button>
            <Button onClick={ConfirmChangeLabel}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改颜色</DialogTitle>
            <DialogDescription>修改当前选中项的颜色。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>颜色选择</Label>
            <Input
              type="color"
              value={colorDraft}
              onChange={(e) => setColorDraft(e.target.value)}
              className="h-10 p-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColorDialogOpen(false)}>取消</Button>
            <Button onClick={ConfirmChangeColor}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名项目</DialogTitle>
            <DialogDescription>修改当前项目的名称。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>项目名称</Label>
            <Input
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              placeholder="请输入项目名称"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>取消</Button>
            <Button onClick={ConfirmRename}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        if (open) { setAddDialogOpen(true); return; }
        closeAddDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加节点</DialogTitle>
            <DialogDescription>
              输入节点信息后可选择继续添加，或直接确认一次性创建多个节点。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="node-label-input">节点名称</Label>
              <Input
                id="node-label-input"
                placeholder="请输入节点名称"
                value={draft.label}
                onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>节点类型</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {draftTypeConfig?.label || draft.workflowType}
                    <span className="text-xs text-muted-foreground">▼</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {WORKFLOW_TYPE_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setDraft((prev) => ({
                        ...prev,
                        workflowType: opt.value,
                        color: DEFAULT_NODE_COLORS[opt.value],
                      }))}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-color-input">节点颜色</Label>
              <Input
                id="node-color-input"
                type="color"
                value={draft.color}
                onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))}
                className="h-10 w-24 p-1"
              />
            </div>

            {queuedDrafts.length > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-sm text-muted-foreground">已暂存 {queuedDrafts.length} 个节点（点击可编辑）</div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {queuedDrafts.map((item, index) => {
                    const typeLabel = WORKFLOW_TYPE_OPTIONS.find((opt) => opt.value === item.workflowType)?.label || item.workflowType;
                    const isEditing = editingQueuedDraftIndex === index;
                    return (
                      <Button
                        key={`${item.workflowType}-${index}`}
                        variant={isEditing ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => {
                          setEditingQueuedDraftIndex(index);
                          setDraft(item);
                        }}
                      >
                        <span className="truncate text-left">{index + 1}. {item.label}</span>
                        <span className="text-xs text-muted-foreground">{typeLabel}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            {editingQueuedDraftIndex !== null && (
              <div className="text-xs text-muted-foreground">
                正在编辑第 {editingQueuedDraftIndex + 1} 项，点击“继续添加”将更新该项。
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>取消</Button>
            <Button variant="secondary" onClick={ContinueAddNodes}>{editingQueuedDraftIndex !== null ? '更新并继续' : '继续添加'}</Button>
            <Button onClick={ConfirmAddNodes}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveDraftDialogOpen} onOpenChange={setSaveDraftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存草稿</DialogTitle>
            <DialogDescription>
              当前项目尚未保存到数据库。是否保存草稿？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardDraft}>不保存</Button>
            <Button onClick={handleSaveDraft}>保存草稿</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>工作流验证失败</DialogTitle>
            <DialogDescription>
              请修复以下问题后重新运行：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-sm text-red-600 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{error}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setValidationDialogOpen(false)}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectPage;
