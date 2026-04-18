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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParams, useRouter } from 'next/navigation';
import { useWorkflowStore } from '@/store/workflowStore';
import { HistoryOperationType } from '@/types';

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

const getInvertedTextColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

const nodeColor = (node: Node) => `${node.style?.backgroundColor ?? 'lightgray'}`;

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
  const [colorDraft, setColorDraft] = useState<string>('#d1d5db');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [saveDraftDialogOpen, setSaveDraftDialogOpen] = useState(false);

  const [queuedDrafts, setQueuedDrafts] = useState<AddNodeDraft[]>([]);
  const [draft, setDraft] = useState<AddNodeDraft>(createDefaultDraft);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  const dragSessionRef = useRef<{
    nodeId: string;
    startPosition: XYPosition;
    snapshot: GraphSnapshot;
  } | null>(null);
  const initializedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    if (projectId) {
      initProject(projectId);
    }
  }, [projectId, initProject]);

  useEffect(() => {
    if (!currentProject || currentProject.id !== projectId) return;
    if (initializedProjectIdRef.current === currentProject.id) return;

    initializedProjectIdRef.current = currentProject.id;
    const projectNodes = currentProject.nodes;
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
          nodes: structuredClone(snapshot.nodes),
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

    const restoredNodes = structuredClone(targetSnapshot.nodes);
    const restoredEdges = structuredClone(targetSnapshot.edges);
    nodesRef.current = restoredNodes;
    edgesRef.current = restoredEdges;
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setCurrentHistoryIndexLocal(targetHistoryIndex);

    if (syncStore) {
      goToHistoryIndex(targetHistoryIndex);
    }
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

    if (next.nodes === current.nodes && next.edges === current.edges) {
      return;
    }

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

    pushHistoryEntry('node_moved', 'Node Moved', [node.id], {
      nodes: structuredClone(nodesRef.current),
      edges: structuredClone(edgesRef.current),
    });
  }, [pushHistoryEntry]);

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
      }), { operationType: 'edge_added', description: 'Edge Added' });
    },
    [applyGraphUpdate],
  );

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

    const newNodeIds = allDrafts.map((_, index) => `node-${Date.now()}-${index}`);
    const operationType: HistoryOperationType = allDrafts.length > 1 ? 'nodes_added' : 'node_added';

    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => ({
      nodes: [
        ...currentNodes,
        ...allDrafts.map((item, index) => ({
          id: newNodeIds[index],
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
    }), { operationType, description: allDrafts.length > 1 ? `Nodes Added (${allDrafts.length})` : 'Node Added', affectedIds: newNodeIds });

    closeAddDialog();
  };

  const DeleteNodes = () => {
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
      if (selectedEdgeIds.has(contextMenuTarget.id)) {
        edgeIdsToDelete = selectedEdgeIds;
      } else {
        edgeIdsToDelete = new Set([contextMenuTarget.id]);
      }
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
      setColorDraft(selectedNodes[0].style?.backgroundColor as string || '#d1d5db');
    } else if (selectedEdges.length > 0) {
      setColorDraft(selectedEdges[0].style?.stroke as string || '#d1d5db');
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
            ? {
                ...n,
                style: {
                  ...n.style,
                  backgroundColor: colorDraft,
                  color: getInvertedTextColor(colorDraft),
                },
              }
            : n
        ),
        edges: currentEdges.map((e) =>
          selectedEdgeIds.has(e.id) ? { ...e, style: { ...e.style, stroke: colorDraft } } : e
        ),
      };
    }, { operationType: 'color_changed', description: 'Color Changed' });
    setColorDialogOpen(false);
  };

  const ChangeNodeTypes = (type: WorkflowNodeType) => {
    applyGraphUpdate(({ nodes: currentNodes, edges: currentEdges }) => {
      const selectedNodeIds = new Set(currentNodes.filter((n) => n.selected).map((n) => n.id));
      return {
        nodes: currentNodes.map((n) => (selectedNodeIds.has(n.id) ? { ...n, type } : n)),
        edges: currentEdges, 
      };
    }, { operationType: 'type_changed', description: 'Type Changed' });
  };

  const Back = useCallback(() => {
    if (currentHistoryIndexLocal < 0) {
      return;
    }

    restoreSnapshotAt(currentHistoryIndexLocal - 1);
  }, [currentHistoryIndexLocal, restoreSnapshotAt]);

  const Forward = useCallback(() => {
    const maxHistoryIndex = (currentProject?.historyOperations.length ?? 0) - 1;
    if (currentHistoryIndexLocal >= maxHistoryIndex) {
      return;
    }

    restoreSnapshotAt(currentHistoryIndexLocal + 1);
  }, [currentProject?.historyOperations.length, currentHistoryIndexLocal, restoreSnapshotAt]);

  const OpenRenameDialog = useCallback(() => {
    if (currentProject) {
      setRenameDraft(currentProject.topic);
      setRenameDialogOpen(true);
    }
  }, [currentProject]);

  const ConfirmRename = useCallback(() => {
    setTopic(renameDraft);
    setRenameDialogOpen(false);
  }, [renameDraft, setTopic]);

  const handleAutoSaveChange = useCallback((checked: boolean | 'indeterminate') => {
    setAutoSaveEnabled(checked === true);
  }, [setAutoSaveEnabled]);

  useEffect(() => {
    return () => {
      setAutoSaveEnabled(false);
    };
  }, [setAutoSaveEnabled]);

  const handleBack = useCallback(async () => {
    const existingProject = await loadFromDB(projectId);
    if (!existingProject) {
      setSaveDraftDialogOpen(true);
    } else {
      router.push('/studio/workflows');
    }
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
            <ContextMenuItem onClick={Back} disabled={currentHistoryIndexLocal < 0}>Back</ContextMenuItem>
            <ContextMenuItem onClick={Forward} disabled={currentHistoryIndexLocal >= maxHistoryIndex}>Forward</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

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
    </div>
  );
};

export default ProjectPage;
