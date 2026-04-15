'use client';
import React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, Background, Controls,
  type Node, type Edge,
  type Connection,
  type ReactFlowInstance,
  type XYPosition,
  applyEdgeChanges, applyNodeChanges,
  EdgeChange, NodeChange, addEdge,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParams } from 'next/navigation';

type WorkflowNodeType = 'input' | 'output' | 'default';

type AddNodeDraft = {
  label: string;
  type: WorkflowNodeType;
  color: string;
};

type GraphSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

const NODE_TYPE_OPTIONS: WorkflowNodeType[] = ['input', 'output', 'default'];
const EDGE_INSERT_DISTANCE_THRESHOLD = 36;

const createDefaultDraft = (): AddNodeDraft => ({
  label: '',
  type: 'default',
  color: '#d1d5db',
});


const initialNode = {
  id: 'first-node',
  data: {
    label: 'first node',
  },
  position: { x: 0, y: 0 },
  style: { backgroundColor: 'lightblue' },
  type: 'input' as WorkflowNodeType,
};

const nodeColor = (node: Node) => `${node.style?.backgroundColor ?? 'lightgray'}`;

const ProjectPage = () => {
  // todo: 根据id获取DB中workflow project
  const params = useParams<{ projectId: string }>();
  console.log(params);

  const [nodes, setNodes] = useState<Node[]>([initialNode]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [historyBackStack, setHistoryBackStack] = useState<GraphSnapshot[]>([]);
  const [historyForwardStack, setHistoryForwardStack] = useState<GraphSnapshot[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  const [lastContextPosition, setLastContextPosition] = useState<XYPosition>({ x: 0, y: 0 });
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [queuedDrafts, setQueuedDrafts] = useState<AddNodeDraft[]>([]);
  const [draft, setDraft] = useState<AddNodeDraft>(createDefaultDraft);

  // 使用 ref 保存最新图数据，避免在异步回调中读取到过期 state。
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // 拖拽历史策略：
  // - drag start：记录起点快照
  // - drag move：仅更新图，不写历史
  // - drag stop：若位置变化，写入一次历史
  const dragSessionRef = useRef<{
    nodeId: string;
    startPosition: XYPosition;
    snapshot: GraphSnapshot;
  } | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const createSnapshot = useCallback((): GraphSnapshot => ({
    nodes: structuredClone(nodesRef.current),
    edges: structuredClone(edgesRef.current),
  }), []);

  const applyGraphUpdate = useCallback((
    updater: (current: GraphSnapshot) => GraphSnapshot,
    options?: { recordHistory?: boolean },
  ) => {
    const recordHistory = options?.recordHistory ?? true;
    const current: GraphSnapshot = {
      nodes: nodesRef.current,
      edges: edgesRef.current,
    };
    const next = updater(current);

    if (next.nodes === current.nodes && next.edges === current.edges) {
      return;
    }

    if (recordHistory) {
      setHistoryBackStack((prev) => [...prev, createSnapshot()]);
      setHistoryForwardStack([]);
    }

    nodesRef.current = next.nodes;
    edgesRef.current = next.edges;
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [createSnapshot]);

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

    if (!session || session.nodeId !== node.id) {
      return;
    }

    const moved = session.startPosition.x !== node.position.x || session.startPosition.y !== node.position.y;
    if (!moved) {
      return;
    }

    setHistoryBackStack((prev) => [...prev, session.snapshot]);
    setHistoryForwardStack([]);
  }, []);

  const resetAddDialogState = useCallback(() => {
    setQueuedDrafts([]);
    setDraft(createDefaultDraft());
  }, []);

  const closeAddDialog = useCallback(() => {
    setAddDialogOpen(false);
    resetAddDialogState();
  }, [resetAddDialogState]);

  const screenToFlowPosition = useCallback((clientX: number, clientY: number): XYPosition => {
    if (!reactFlowInstance) {
      return { x: clientX, y: clientY };
    }
    return reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
  }, [reactFlowInstance]);

  const pointToSegmentDistance = useCallback(
    (p: XYPosition, a: XYPosition, b: XYPosition) => {
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const apx = p.x - a.x;
      const apy = p.y - a.y;
      const abLenSq = abx * abx + aby * aby;

      if (abLenSq === 0) {
        return Math.hypot(p.x - a.x, p.y - a.y);
      }

      const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
      const closest = {
        x: a.x + abx * t,
        y: a.y + aby * t,
      };
      return Math.hypot(p.x - closest.x, p.y - closest.y);
    },
    [],
  );

  const getNodeCenter = useCallback((node: Node): XYPosition => {
    const width = node.measured?.width ?? node.width ?? 0;
    const height = node.measured?.height ?? node.height ?? 0;
    const x = node.position.x;
    const y = node.position.y;
    return {
      x: x + width / 2,
      y: y + height / 2,
    };
  }, []);

  const findClosestEdgeForNode = useCallback((draggedNode: Node) => {
    const draggedCenter = getNodeCenter(draggedNode);
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    let matchedEdge: Edge | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) {
        continue;
      }

      const sourceCenter = getNodeCenter(sourceNode);
      const targetCenter = getNodeCenter(targetNode);
      const distance = pointToSegmentDistance(draggedCenter, sourceCenter, targetCenter);

      if (distance < minDistance) {
        minDistance = distance;
        matchedEdge = edge;
      }
    }

    if (minDistance > EDGE_INSERT_DISTANCE_THRESHOLD) {
      return null;
    }

    return matchedEdge;
  }, [edges, getNodeCenter, nodes, pointToSegmentDistance]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      // position 变更来自拖拽过程，这里不记录历史，避免每一帧都入栈。
      const hasPositionChange = changes.some((change) => change.type === 'position');

      applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
        nodes: applyNodeChanges(changes, currentNodes),
        edges: currentEdges,
      }), { recordHistory: !hasPositionChange });
    },
    [applyGraphUpdate],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
        nodes: currentNodes,
        edges: applyEdgeChanges(changes, currentEdges),
      }));
    },
    [applyGraphUpdate],
  );
  const onConnect = useCallback(
    (params: Connection) => {
      applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
        nodes: currentNodes,
        edges: addEdge(params, currentEdges),
      }));
    },
    [applyGraphUpdate],
  );

  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuNodeId(null);
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  const onNodeContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>, node: Node) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuNodeId(node.id);
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    startDragHistory(node);
  }, [startDragHistory]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, draggedNode: Node) => {
    // 拖拽结束时仅写入一次历史。
    commitDragHistory(draggedNode);

    if (draggedNode.type !== 'default') {
      return;
    }

    const closestEdge = findClosestEdgeForNode(draggedNode);
    if (!closestEdge) {
      return;
    }

    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const targetEdge = currentEdges.find((edge) => edge.id === closestEdge.id);
      if (!targetEdge) {
        return {
          nodes: currentNodes,
          edges: currentEdges,
        };
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
    }, { recordHistory: false });
  }, [applyGraphUpdate, commitDragHistory, findClosestEdgeForNode]);

  const appendCurrentDraftToQueue = useCallback(() => {
    const normalizedLabel = draft.label.trim();
    if (!normalizedLabel) {
      return false;
    }

    setQueuedDrafts((prev) => [...prev, {
      ...draft,
      label: normalizedLabel,
    }]);
    setDraft((prev) => ({ ...prev, label: '' }));
    return true;
  }, [draft]);

  const AddNodes = () => {
    setAddDialogOpen(true);
  };

  const ContinueAddNodes = () => {
    appendCurrentDraftToQueue();
  };

  const ConfirmAddNodes = () => {
    const normalizedLabel = draft.label.trim();
    const allDrafts = normalizedLabel
      ? [...queuedDrafts, { ...draft, label: normalizedLabel }]
      : [...queuedDrafts];

    if (!allDrafts.length) {
      closeAddDialog();
      return;
    }

    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
      nodes: [
        ...currentNodes,
        // 多节点按网格偏移，避免完全重叠。
        ...allDrafts.map((item, index) => ({
          id: `node-${Date.now()}-${index}`,
          data: { label: item.label },
          type: item.type,
          position: {
            x: lastContextPosition.x + (index % 3) * 180,
            y: lastContextPosition.y + Math.floor(index / 3) * 100,
          },
          style: { backgroundColor: item.color },
        })),
      ],
      edges: currentEdges,
    }));

    closeAddDialog();
  };

  const DeleteNodes = () => {
    // 删除优先级：多选 > 右键目标节点 > 当前选中节点
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
    let nodeIdsToDelete = new Set<string>();

    if (selectedNodeIds.size > 1) {
      nodeIdsToDelete = selectedNodeIds;
    } else if (contextMenuNodeId && selectedNodeIds.has(contextMenuNodeId)) {
      nodeIdsToDelete = selectedNodeIds;
    } else if (contextMenuNodeId) {
      nodeIdsToDelete = new Set([contextMenuNodeId]);
    } else {
      nodeIdsToDelete = selectedNodeIds;
    }

    if (!nodeIdsToDelete.size) {
      return;
    }

    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
      nodes: currentNodes.filter((node) => !nodeIdsToDelete.has(node.id)),
      edges: currentEdges.filter((edge) => !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)),
    }));

  };
  const Back = () => {
    if (!historyBackStack.length) {
      return;
    }

    const previous = historyBackStack[historyBackStack.length - 1];
    const currentSnapshot = createSnapshot();

    setHistoryBackStack((prev) => prev.slice(0, -1));
    setHistoryForwardStack((prev) => [currentSnapshot, ...prev]);

    const restoredNodes = structuredClone(previous.nodes);
    const restoredEdges = structuredClone(previous.edges);
    nodesRef.current = restoredNodes;
    edgesRef.current = restoredEdges;
    setNodes(restoredNodes);
    setEdges(restoredEdges);

  };
  const Forward = () => {
    if (!historyForwardStack.length) {
      return;
    }

    const next = historyForwardStack[0];
    const currentSnapshot = createSnapshot();

    setHistoryForwardStack((prev) => prev.slice(1));
    setHistoryBackStack((prev) => [...prev, currentSnapshot]);

    const restoredNodes = structuredClone(next.nodes);
    const restoredEdges = structuredClone(next.edges);
    nodesRef.current = restoredNodes;
    edgesRef.current = restoredEdges;
    setNodes(restoredNodes);
    setEdges(restoredEdges);

  };


  return (
    <div className='h-full w-full'>
      {/* <h1>Project</h1> */}
      <ContextMenu>
        <ContextMenuTrigger className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneContextMenu={onPaneContextMenu}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            onInit={setReactFlowInstance}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap nodeColor={nodeColor} />
          </ReactFlow>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={AddNodes}>Add Nodes</ContextMenuItem>
          <ContextMenuItem onClick={DeleteNodes}>Delete Nodes</ContextMenuItem>
          <ContextMenuItem onClick={Back} disabled={historyBackStack.length === 0}>Back</ContextMenuItem>
          <ContextMenuItem onClick={Forward} disabled={historyForwardStack.length === 0}>Forward</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        if (open) {
          setAddDialogOpen(true);
          return;
        }
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
                    {draft.type}
                    <span className="text-xs text-muted-foreground">▼</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {NODE_TYPE_OPTIONS.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setDraft((prev) => ({ ...prev, type }))}
                    >
                      {type}
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
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                已暂存 {queuedDrafts.length} 个节点，确认后将一并创建。
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>取消</Button>
            <Button variant="secondary" onClick={ContinueAddNodes}>继续添加</Button>
            <Button onClick={ConfirmAddNodes}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectPage;