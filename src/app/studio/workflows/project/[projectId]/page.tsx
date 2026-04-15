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

/**
 * 根据背景颜色（Hex 格式）计算其亮白度，返回该反色的黑/白值
 * @param hexColor 16 进制颜色字符串 (e.g. #ffffff)
 */
const getInvertedTextColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // 使用经典的亮度公式计算
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

// test
// const initialNode = {
//   id: 'first-node',
//   data: {
//     label: 'first node',
//   },
//   position: { x: 0, y: 0 },
//   style: { backgroundColor: 'lightblue' },
//   type: 'input' as WorkflowNodeType,
// };

const nodeColor = (node: Node) => `${node.style?.backgroundColor ?? 'lightgray'}`;

const ProjectPage = () => {
  // 从路由参数中获取项目 ID
  const params = useParams<{ projectId: string }>();
  console.log(params);

  // --- 状态管理 ---
  // 当前画布上的节点和边
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  // 历史记录栈，用于实现撤销 (Back) 和重做 (Forward)
  const [historyBackStack, setHistoryBackStack] = useState<GraphSnapshot[]>([]);
  const [historyForwardStack, setHistoryForwardStack] = useState<GraphSnapshot[]>([]);
  // ReactFlow 实例，用于坐标转换等操作
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  // 记录最后一次右键点击时的 Flow 坐标，用于在该位置生成新节点
  const [lastContextPosition, setLastContextPosition] = useState<XYPosition>({ x: 0, y: 0 });
  // 记录当前触发右键菜单的元素类型和 ID
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    type: 'pane' | 'node' | 'edge';
    id: string | null;
  }>({ type: 'pane', id: null });

  // 节点添加弹窗的状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  // label 修改弹窗的状态
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string>('');
  // 颜色修改弹窗的状态
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [colorDraft, setColorDraft] = useState<string>('#d1d5db');

  // 弹窗中点击“继续添加”后暂存的节点列表
  const [queuedDrafts, setQueuedDrafts] = useState<AddNodeDraft[]>([]);
  // 当前正在输入的节点草稿
  const [draft, setDraft] = useState<AddNodeDraft>(createDefaultDraft);

  // 使用 ref 保存最新图数据，避免在异步回调或闭包中读取到过期的 state。
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // 拖拽历史记录会话：只在拖拽开始和结束时处理历史记录，避免拖拽过程中的高频触发
  const dragSessionRef = useRef<{
    nodeId: string;
    startPosition: XYPosition;
    snapshot: GraphSnapshot;
  } | null>(null);

  // 同步 ref 与 state
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  /**
   * 创建当前画布状态的深度克隆快照
   */
  const createSnapshot = useCallback((): GraphSnapshot => ({
    nodes: structuredClone(nodesRef.current),
    edges: structuredClone(edgesRef.current),
  }), []);

  /**
   * 统一的图数据更新入口，处理历史记录逻辑
   * @param updater 更新函数，接收当前状态并返回新状态
   * @param options 配置项，recordHistory 控制是否记录到撤销栈
   */
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

    // 如果数据没有变化，则不进行更新
    if (next.nodes === current.nodes && next.edges === current.edges) {
      return;
    }

    // 如果需要记录历史，则将当前快照压入 Back 栈，并清空 Forward 栈
    if (recordHistory) {
      setHistoryBackStack((prev) => [...prev, createSnapshot()]);
      setHistoryForwardStack([]);
    }

    // 更新 ref 和 state
    nodesRef.current = next.nodes;
    edgesRef.current = next.edges;
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [createSnapshot]);

  /**
   * 开启拖拽历史记录会话
   */
  const startDragHistory = useCallback((node: Node) => {
    dragSessionRef.current = {
      nodeId: node.id,
      startPosition: { ...node.position },
      snapshot: createSnapshot(),
    };
  }, [createSnapshot]);

  /**
   * 提交拖拽历史记录：如果位置发生了实际偏移，则将开始时的快照存入历史
   */
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

  /**
   * 重置添加节点弹窗的状态
   */
  const resetAddDialogState = useCallback(() => {
    setQueuedDrafts([]);
    setDraft(createDefaultDraft());
  }, []);

  /**
   * 关闭添加节点弹窗
   */
  const closeAddDialog = useCallback(() => {
    setAddDialogOpen(false);
    resetAddDialogState();
  }, [resetAddDialogState]);

  /**
   * 将屏幕坐标转换为 Flow 画布坐标
   */
  const screenToFlowPosition = useCallback((clientX: number, clientY: number): XYPosition => {
    if (!reactFlowInstance) {
      return { x: clientX, y: clientY };
    }
    return reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
  }, [reactFlowInstance]);

  /**
   * 计算点到线段的最短距离，用于检测节点是否被拖拽到边上
   */
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

  /**
   * 获取节点的中心点位置
   */
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

  /**
   * 查找距离指定节点最近的边，并判断是否在吸附阈值内
   */
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

  // --- ReactFlow 事件回调 ---

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      // position 变更通常来自拖拽过程，这里recordHistory设为false以避免高频入栈
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

  /**
   * 画布空白处右键：转换坐标，更新右键目标为 pane
   */
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuTarget({ type: 'pane', id: null });
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  /**
   * 节点右键：转换坐标，更新右键目标为 node
   */
  const onNodeContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>, node: Node) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuTarget({ type: 'node', id: node.id });
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  /**
   * 边右键：转换坐标，更新右键目标为 edge
   */
  const onEdgeContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>, edge: Edge) => {
    const flowPos = screenToFlowPosition(event.clientX, event.clientY);
    setContextMenuTarget({ type: 'edge', id: edge.id });
    setLastContextPosition(flowPos);
  }, [screenToFlowPosition]);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    startDragHistory(node);
  }, [startDragHistory]);

  const onNodeDragStop = useCallback((_: React.MouseEvent, draggedNode: Node) => {
    // 拖拽结束：提交历史并尝试执行“插入边”逻辑
    commitDragHistory(draggedNode);

    // 只有 default 类型节点支持拖拽插入边
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
        return { nodes: currentNodes, edges: currentEdges };
      }

      // 拆分边： a -> b 变为 a -> new -> b
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
    }, { recordHistory: false }); // 此处不记录是因为 commitDragHistory 已经处理过一次
  }, [applyGraphUpdate, commitDragHistory, findClosestEdgeForNode]);

  /**
   * 将当前正在输入的内容暂存，以便继续添加下一个
   */
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

  /**
   * 打开添加节点弹窗
   */
  const AddNodes = () => {
    setAddDialogOpen(true);
  };

  /**
   * 弹窗中的“继续添加”
   */
  const ContinueAddNodes = () => {
    appendCurrentDraftToQueue();
  };

  /**
   * 弹窗中的“确认”：合并所有暂存草稿并应用更新
   */
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
        // 根据网格布局略微偏移多个新节点
        ...allDrafts.map((item, index) => ({
          id: `node-${Date.now()}-${index}`,
          data: { label: item.label },
          type: item.type,
          position: {
            x: lastContextPosition.x + (index % 3) * 180,
            y: lastContextPosition.y + Math.floor(index / 3) * 100,
          },
          style: {
            backgroundColor: item.color,
            color: getInvertedTextColor(item.color),
          },
        })),
      ],
      edges: currentEdges,
    }));

    closeAddDialog();
  };

  /**
   * 删除选中的节点及边
   */
  const DeleteNodes = () => {
    // 确定待删除的 ID 集合：如果右键了一个未选中的节点，则只删这一个；如果右键了选区内的节点，则删除整批
    const selectedNodeIds = new Set(nodes.filter((node) => node.selected).map((node) => node.id));
    let nodeIdsToDelete = new Set<string>();

    if (contextMenuTarget.type === 'node' && contextMenuTarget.id) {
      if (selectedNodeIds.has(contextMenuTarget.id)) {
        nodeIdsToDelete = selectedNodeIds;
      } else {
        nodeIdsToDelete = new Set([contextMenuTarget.id]);
      }
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

  /**
   * 删除选中的边
   */
  const DeleteEdges = () => {
    // 确定待删除的 ID 集合
    const selectedEdgeIds = new Set(edgesRef.current.filter((e) => e.selected).map((e) => e.id));
    let edgeIdsToDelete = new Set<string>();

    if (contextMenuTarget.type === 'edge' && contextMenuTarget.id) {
      if (selectedEdgeIds.has(contextMenuTarget.id)) {
        edgeIdsToDelete = selectedEdgeIds;
      } else {
        edgeIdsToDelete = new Set([contextMenuTarget.id]);
      }
    } else {
      edgeIdsToDelete = selectedEdgeIds;
    }

    if (!edgeIdsToDelete.size) return;

    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
      nodes: currentNodes,
      edges: currentEdges.filter((edge) => !edgeIdsToDelete.has(edge.id)),
    }));
  };

  /**
   * 修改 Label 弹窗打开逻辑 (Node 或 Edge)
   * 仅当选中单个节点或单条边时有效
   */
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

  /**
   * 确认修改 Label
   */
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
    });
    setLabelDialogOpen(false);
  };

  /**
   * 修改颜色弹窗打开逻辑
   */
  const OpenColorDialog = () => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    const selectedEdges = edgesRef.current.filter((e) => e.selected);
    if (selectedNodes.length > 0) {
      setColorDraft(selectedNodes[0].style?.backgroundColor as string || '#d1d5db');
    } else if (selectedEdges.length > 0) {
      setColorDraft(selectedEdges[0].style?.stroke as string || '#d1d5db');
    }
    setColorDialogOpen(true);
  };

  /**
   * 确认修改颜色 (支持多选批量)
   */
  const ConfirmChangeColor = () => {
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const selectedNodeIds = new Set(currentNodes.filter((n) => n.selected).map((n) => n.id));
      const selectedEdgeIds = new Set(currentEdges.filter((e) => e.selected).map((e) => e.id));

      return {
        nodes: currentNodes.map((n) =>
          selectedNodeIds.has(n.id)
            ? {
                ...n,
                style: {
                  ...n.style,
                  backgroundColor: colorDraft,
                  // 字体颜色跟随背景自动反显
                  color: getInvertedTextColor(colorDraft),
                },
              }
            : n
        ),
        edges: currentEdges.map((e) =>
          selectedEdgeIds.has(e.id) ? { ...e, style: { ...e.style, stroke: colorDraft } } : e
        ),
      };
    });
    setColorDialogOpen(false);
  };

  /**
   * 修改节点类型 (支持多选批量)
   */
  const ChangeNodeTypes = (type: WorkflowNodeType) => {
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const selectedNodeIds = new Set(currentNodes.filter((n) => n.selected).map((n) => n.id));
      return {
        nodes: currentNodes.map((n) => (selectedNodeIds.has(n.id) ? { ...n, type } : n)),
        edges: currentEdges, 
      };
    });
  };

  /**
   * 撤销 (Undo)
   */
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

  /**
   * 重做 (Redo)
   */
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


  const hasSelectedNodes = nodes.some(n => n.selected);
  const hasSelectedEdges = edges.some(e => e.selected);
  const selectedNodesCount = nodes.filter(n => n.selected).length;
  const selectedEdgesCount = edges.filter(e => e.selected).length;

  // 判断是否可以在右键位置或针对选中项进行操作
  const canDeleteNodes = contextMenuTarget.type === 'node' || hasSelectedNodes;
  const canDeleteEdges = contextMenuTarget.type === 'edge' || hasSelectedEdges;

  // Change Label 仅在选中单个元素（Node 或 Edge）时可用
  let canChangeLabel = false;
  if (contextMenuTarget.type === 'node') {
    // 如果右键在节点上，如果是多选且包含此节点，则算多选；如果未选中或仅中此节点，算单选
    const isTargetSelected = nodes.find(n => n.id === contextMenuTarget.id)?.selected;
    canChangeLabel = isTargetSelected ? selectedNodesCount === 1 : true;
  } else if (contextMenuTarget.type === 'edge') {
    const isTargetSelected = edges.find(e => e.id === contextMenuTarget.id)?.selected;
    canChangeLabel = isTargetSelected ? selectedEdgesCount === 1 : true;
  } else {
    // 在空白处右键，如果当前仅选中了一个节点或一个边
    canChangeLabel = (selectedNodesCount === 1 && selectedEdgesCount === 0) || (selectedNodesCount === 0 && selectedEdgesCount === 1);
  }

  const canChangeColor = contextMenuTarget.type === 'node' || hasSelectedNodes;
  const canChangeType = contextMenuTarget.type === 'node' || hasSelectedNodes;

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
            onEdgeContextMenu={onEdgeContextMenu}
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
          <ContextMenuItem onClick={DeleteNodes} disabled={!canDeleteNodes}>Delete Nodes</ContextMenuItem>
          <ContextMenuItem onClick={DeleteEdges} disabled={!canDeleteEdges}>Delete Edges</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={OpenLabelDialog} disabled={!canChangeLabel}>Change Label / Add Label</ContextMenuItem>
          <ContextMenuItem onClick={OpenColorDialog} disabled={!canChangeColor}>Change Color</ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={!canChangeType}>Change Node Type</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {NODE_TYPE_OPTIONS.map((type) => (
                <ContextMenuItem key={type} onClick={() => ChangeNodeTypes(type)}>
                  {type}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={Back} disabled={historyBackStack.length === 0}>Back</ContextMenuItem>
          <ContextMenuItem onClick={Forward} disabled={historyForwardStack.length === 0}>Forward</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* 修改 Label 弹窗 */}
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

      {/* 修改颜色弹窗 */}
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