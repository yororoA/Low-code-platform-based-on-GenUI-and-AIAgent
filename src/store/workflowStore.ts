import { create } from "zustand";
import { Node, Edge } from '@xyflow/react';
import { produce } from "immer";
import { WorkflowProject, WorkflowProjectSummary, HistoryOperation, HistoryOperationType, WorkflowHistorySnapshot } from "@/types";

const WORKFLOW_DB_NAME = 'workflow-db';
const AUTO_SAVE_INTERVAL = 30000;

interface GraphSnapshot {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowProjectState {
  currentProject: WorkflowProject | null;
  historyBackStack: GraphSnapshot[];
  historyForwardStack: GraphSnapshot[];
  autoSaveTimer: ReturnType<typeof setInterval> | null;
  isAutoSaveEnabled: boolean;
  currentHistoryIndex: number;
  
  initProject: (projectId: string) => Promise<void>;
  setTopic: (topic: string) => void;
  addHistoryOperation: (type: HistoryOperationType, description: string, affectedIds?: string[], historySnapshot?: WorkflowHistorySnapshot) => void;
  updateGraph: (nodes: Node[], edges: Edge[], recordHistory?: boolean) => void;
  back: () => void;
  forward: () => void;
  saveToDB: () => Promise<void>;
  startAutoSave: () => void;
  stopAutoSave: () => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  toggleAutoSave: () => void;
  loadFromDB: (projectId: string) => Promise<WorkflowProject | null>;
  loadAllFromDB: () => Promise<WorkflowProjectSummary[]>;
  deleteFromDB: (projectId: string) => Promise<void>;
  goToHistoryIndex: (targetIndex: number) => void;
}

const generateDescription = (type: HistoryOperationType, count?: number): string => {
  const descriptions: Record<HistoryOperationType, string> = {
    'node_added': 'Node Added',
    'nodes_added': `Nodes Added (${count || 1})`,
    'node_deleted': 'Node Deleted',
    'nodes_deleted': `Nodes Deleted (${count || 1})`,
    'edge_added': 'Edge Added',
    'edges_added': `Edges Added (${count || 1})`,
    'edge_deleted': 'Edge Deleted',
    'edges_deleted': `Edges Deleted (${count || 1})`,
    'node_moved': 'Node Moved',
    'nodes_moved': 'Nodes Moved',
    'label_changed': 'Label Changed',
    'color_changed': 'Color Changed',
    'type_changed': 'Type Changed',
    'edge_inserted': 'Edge Inserted',
  };
  return descriptions[type];
};

const createDefaultProject = (projectId: string): WorkflowProject => ({
  id: projectId,
  topic: 'Unnamed Project',
  timestamp: new Date(),
  nodes: [],
  edges: [],
  historyOperations: [],
  historySnapshots: [{ nodes: [], edges: [] }],
});

const getIndexedDB = (): IDBFactory => {
  const indexedDBRef = globalThis.indexedDB;
  if (!indexedDBRef) {
    throw new Error("IndexedDB is not available in current runtime");
  }
  return indexedDBRef;
};

const openWorkflowDB = async (targetStore?: string, forceUpgrade: boolean = false): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const currentVersion = 1;
    const nextVersion = forceUpgrade ? currentVersion + 1 : currentVersion;
    const request = getIndexedDB().open(WORKFLOW_DB_NAME, nextVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (targetStore && !db.objectStoreNames.contains(targetStore)) {
        const store = db.createObjectStore(targetStore, { keyPath: 'id' });
        store.createIndex('timestampIndex', 'timestamp', { unique: false });
        store.createIndex('topicIndex', 'topic', { unique: false });
        console.log(`Workflow 表 ${targetStore} 创建成功`);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB open blocked by another connection"));
  });
};

const saveWorkflowToDB = async (project: WorkflowProject): Promise<void> => {
  const db = await openWorkflowDB('workflow-store', false);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workflow-store', 'readwrite');
    const store = transaction.objectStore('workflow-store');
    const request = store.put(project);

    request.onsuccess = () => {
      console.log('Workflow project saved to DB:', project.id);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

const loadWorkflowFromDB = async (projectId: string): Promise<WorkflowProject | null> => {
  try {
    const db = await openWorkflowDB('workflow-store', false);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workflow-store', 'readonly');
      const store = transaction.objectStore('workflow-store');
      const request = store.get(projectId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load workflow from DB:', error);
    return null;
  }
};

const loadAllWorkflowsFromDB = async (): Promise<WorkflowProjectSummary[]> => {
  try {
    const db = await openWorkflowDB('workflow-store', false);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workflow-store', 'readonly');
      const store = transaction.objectStore('workflow-store');
      const request = store.getAll();

      request.onsuccess = () => {
        const projects = request.result as WorkflowProject[];
        const summaries: WorkflowProjectSummary[] = projects.map(p => ({
          id: p.id,
          topic: p.topic,
          timestamp: p.timestamp,
        }));
        resolve(summaries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load all workflows from DB:', error);
    return [];
  }
};

const deleteWorkflowFromDB = async (projectId: string): Promise<void> => {
  try {
    const db = await openWorkflowDB('workflow-store', false);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workflow-store', 'readwrite');
      const store = transaction.objectStore('workflow-store');
      const request = store.delete(projectId);

      request.onsuccess = () => {
        console.log('Workflow project deleted from DB:', projectId);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to delete workflow from DB:', error);
  }
};

export const useWorkflowStore = create<WorkflowProjectState>((set, get) => ({
  currentProject: null,
  historyBackStack: [],
  historyForwardStack: [],
  autoSaveTimer: null,
  isAutoSaveEnabled: false,
  currentHistoryIndex: -1,

  initProject: async (projectId: string) => {
    let project = await loadWorkflowFromDB(projectId);
    if (!project) {
      project = createDefaultProject(projectId);
    } else {
      const hasValidSnapshots =
        Array.isArray(project.historySnapshots) &&
        project.historySnapshots.length === project.historyOperations.length + 1;

      if (!hasValidSnapshots) {
        const currentNodes = structuredClone(project.nodes);
        const currentEdges = structuredClone(project.edges);
        project = {
          ...project,
          historyOperations: [],
          historySnapshots: [{ nodes: currentNodes, edges: currentEdges }],
        };
      }
    }
    set({ 
      currentProject: project,
      historyBackStack: [],
      historyForwardStack: [],
      currentHistoryIndex: (project.historyOperations?.length ?? 0) - 1,
    });
  },

  setTopic: (topic: string) => {
    set((state) => ({
      currentProject: state.currentProject 
        ? { ...state.currentProject, topic }
        : null,
    }));
  },

  addHistoryOperation: (type: HistoryOperationType, description: string, affectedIds?: string[], historySnapshot?: WorkflowHistorySnapshot) => {
    set((state) => {
      if (!state.currentProject) return state;
      
      const operation: HistoryOperation = {
        type,
        timestamp: new Date(),
        description: description || generateDescription(type, affectedIds?.length),
        affectedIds,
      };

      const currentIndex = state.currentHistoryIndex;
      const keptOperations = state.currentProject.historyOperations.slice(0, currentIndex + 1);
      const nextOperations = [...keptOperations, operation];
      const fallbackSnapshot: WorkflowHistorySnapshot = {
        nodes: structuredClone(state.currentProject.nodes),
        edges: structuredClone(state.currentProject.edges),
      };
      const snapshotToAppend = historySnapshot ?? fallbackSnapshot;
      const previousSnapshots =
        state.currentProject.historySnapshots && state.currentProject.historySnapshots.length > 0
          ? state.currentProject.historySnapshots
          : [{
            nodes: structuredClone(state.currentProject.nodes),
            edges: structuredClone(state.currentProject.edges),
          }];
      const keptSnapshots = previousSnapshots.slice(0, currentIndex + 2);
      const nextSnapshots = [
        ...keptSnapshots,
        {
          nodes: structuredClone(snapshotToAppend.nodes),
          edges: structuredClone(snapshotToAppend.edges),
        },
      ];
      const nextIndex = nextOperations.length - 1;

      return {
        currentProject: produce(state.currentProject, (draft) => {
          draft.historyOperations = nextOperations;
          draft.historySnapshots = nextSnapshots;
          draft.timestamp = new Date();
        }),
        currentHistoryIndex: nextIndex,
      };
    });
  },

  updateGraph: (nodes: Node[], edges: Edge[], recordHistory: boolean = true) => {
    set((state) => {
      if (!state.currentProject) return state;

      return {
        currentProject: produce(state.currentProject, (draft) => {
          draft.nodes = nodes;
          draft.edges = edges;
          draft.timestamp = new Date();
        }),
        historyBackStack: recordHistory 
          ? [...state.historyBackStack, { nodes: state.currentProject.nodes, edges: state.currentProject.edges }]
          : state.historyBackStack,
        historyForwardStack: recordHistory ? [] : state.historyForwardStack,
      };
    });
  },

  back: () => {
    const { historyBackStack, currentProject, currentHistoryIndex } = get();
    if (!historyBackStack.length || !currentProject) return;

    const previous = historyBackStack[historyBackStack.length - 1];
    const currentSnapshot: GraphSnapshot = {
      nodes: currentProject.nodes,
      edges: currentProject.edges,
    };

    set((state) => ({
      historyBackStack: state.historyBackStack.slice(0, -1),
      historyForwardStack: [currentSnapshot, ...state.historyForwardStack],
      currentProject: produce(state.currentProject!, (draft) => {
        draft.nodes = previous.nodes;
        draft.edges = previous.edges;
        draft.timestamp = new Date();
      }),
      currentHistoryIndex: currentHistoryIndex - 1,
    }));
  },

  forward: () => {
    const { historyForwardStack, currentProject, currentHistoryIndex } = get();
    if (!historyForwardStack.length || !currentProject) return;

    const next = historyForwardStack[0];
    const currentSnapshot: GraphSnapshot = {
      nodes: currentProject.nodes,
      edges: currentProject.edges,
    };

    set((state) => ({
      historyForwardStack: state.historyForwardStack.slice(1),
      historyBackStack: [...state.historyBackStack, currentSnapshot],
      currentProject: produce(state.currentProject!, (draft) => {
        draft.nodes = next.nodes;
        draft.edges = next.edges;
        draft.timestamp = new Date();
      }),
      currentHistoryIndex: currentHistoryIndex + 1,
    }));
  },

  saveToDB: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    
    try {
      await saveWorkflowToDB(currentProject);
      console.log('Workflow saved to DB successfully');
    } catch (error) {
      console.error('Failed to save workflow to DB:', error);
    }
  },

  startAutoSave: () => {
    const { autoSaveTimer } = get();
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
    }

    const timer = setInterval(() => {
      get().saveToDB();
    }, AUTO_SAVE_INTERVAL);

    set({ autoSaveTimer: timer });
  },

  stopAutoSave: () => {
    const { autoSaveTimer } = get();
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      set({ autoSaveTimer: null });
    }
  },

  setAutoSaveEnabled: (enabled: boolean) => {
    if (enabled) {
      set({ isAutoSaveEnabled: true });
      get().startAutoSave();
      return;
    }

    get().stopAutoSave();
    set({ isAutoSaveEnabled: false });
  },

  toggleAutoSave: () => {
    const { isAutoSaveEnabled } = get();
    get().setAutoSaveEnabled(!isAutoSaveEnabled);
  },

  loadFromDB: async (projectId: string) => {
    return await loadWorkflowFromDB(projectId);
  },

  loadAllFromDB: async () => {
    return await loadAllWorkflowsFromDB();
  },

  deleteFromDB: async (projectId: string) => {
    await deleteWorkflowFromDB(projectId);
  },

  goToHistoryIndex: (targetIndex: number) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const maxIndex = (currentProject.historyOperations?.length ?? 0) - 1;
    const normalizedIndex = Math.max(-1, Math.min(targetIndex, maxIndex));
    set({ currentHistoryIndex: normalizedIndex });
  },
}));
