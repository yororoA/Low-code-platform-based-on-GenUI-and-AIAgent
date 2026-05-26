import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  WorkflowGraphState,
  type WorkflowGraphStateType,
  type WorkflowStageInfo,
} from "@/app/api/chat/state";
import { createModelFromState } from "@/app/api/chat/llm";
import type { WorkflowRunPayload, WorkflowNodeType, AgentType } from "@/types";

// ======================== Constants ========================
const MAX_CONTEXT_LENGTH = 12000;

const AGENT_INSTRUCTIONS: Record<AgentType, string> = {
  design: `你是一个专业的UI设计智能体。你的任务是根据用户的需求描述，设计出合理的页面结构和布局方案。
你需要：
1. 分析用户需求，理解页面目标
2. 设计页面结构（头部、主体、侧边栏等）
3. 选择合适的UI组件
4. 输出详细的设计方案描述`,
  build: `你是一个专业的前端构建智能体。你的任务是根据设计方案的描述，构建出具体的UI组件结构。
你需要：
1. 根据设计方案选择合适的组件
2. 规划组件的层级关系
3. 输出组件结构描述`,
  review: `你是一个严格的质量审查智能体。你的任务是对输入的内容进行审查和评估。
你需要：
1. 检查内容是否完整
2. 评估是否符合需求
3. 提出改进建议
4. 输出审查结果和改进意见`,
};

// ======================== Helpers ========================
function normalizeNodeType(type: WorkflowNodeType): Exclude<WorkflowNodeType, "condition"> {
  return type === "condition" ? "branch" : type;
}

function truncateText(text: string, maxLength: number = MAX_CONTEXT_LENGTH): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[上下文已截断，共${text.length}字符]`;
}

function getAgentInstruction(agentType: AgentType): string {
  return AGENT_INSTRUCTIONS[agentType] || AGENT_INSTRUCTIONS.review;
}

function makeStageInfo(
  nodeId: string,
  nodeLabel: string,
  type: WorkflowStageInfo["type"],
  message: string,
): WorkflowStageInfo {
  return { nodeId, nodeLabel, type, message, timestamp: Date.now() };
}

// ======================== Branch Helpers ========================
function isTrueBranchHandle(handle: string | null | undefined): boolean {
  return handle === "cond-true";
}

function isFalseBranchHandle(handle: string | null | undefined): boolean {
  return handle === "cond-false";
}

function isTrueBranchLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();
  return (
    normalized.includes("成立") ||
    normalized.includes("满足") ||
    normalized === "true" ||
    normalized.includes("真")
  );
}

function isFalseBranchLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();
  return (
    normalized.includes("不成立") ||
    normalized.includes("不满足") ||
    normalized === "false" ||
    normalized.includes("假")
  );
}

function parseBooleanResult(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^true\b/.test(normalized)) return true;
  if (/^false\b/.test(normalized)) return false;
  if (/\btrue\b/.test(normalized) && !/\bfalse\b/.test(normalized)) return true;
  if (/\bfalse\b/.test(normalized) && !/\btrue\b/.test(normalized)) return false;
  return normalized.includes("满足") || normalized.includes("成立") || normalized.includes("是");
}

// ======================== Workflow Node/Edge Types ========================
interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  inputText: string;
  agentType?: AgentType;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

// ======================== Graph Builder Context ========================
interface GraphBuildContext {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  nodeMap: Map<string, WorkflowNode>;
  branchTargets: Map<string, { trueTargets: string[]; falseTargets: string[] }>;
  executionCount: Map<string, number>;
  branchFalseRetries: Map<string, number>;
}

// ======================== Node Functions ========================
function createInputNode(_ctx: GraphBuildContext, node: WorkflowNode) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (_state: WorkflowGraphStateType): Promise<Partial<WorkflowGraphStateType>> => {
    const inputContext = node.inputText || "";
    return {
      accumulatedContext: inputContext,
      nodeOutputs: { [node.id]: inputContext },
      focusedNodeId: node.id,
      stageInfo: [
        makeStageInfo(node.id, node.label, "focus", `输入节点: ${node.label}`),
      ],
    };
  };
}

function createRequirementNode(ctx: GraphBuildContext, node: WorkflowNode) {
  return async (state: WorkflowGraphStateType): Promise<Partial<WorkflowGraphStateType>> => {
    const upstream = state.accumulatedContext;
    const requirementContext = truncateText(
      `${upstream}\n\n[附加要求]\n${node.inputText || "无"}`,
    );
    return {
      accumulatedContext: requirementContext,
      nodeOutputs: { [node.id]: requirementContext },
      focusedNodeId: node.id,
      stageInfo: [
        makeStageInfo(node.id, node.label, "focus", `需求节点: ${node.label}`),
        makeStageInfo(
          node.id,
          node.label,
          "building",
          `注入详细要求: ${node.inputText?.slice(0, 50)}...`,
        ),
      ],
    };
  };
}

function createAgentNode(ctx: GraphBuildContext, node: WorkflowNode) {
  return async (state: WorkflowGraphStateType): Promise<Partial<WorkflowGraphStateType>> => {
    const agentType = node.agentType || "review";
    const instruction = getAgentInstruction(agentType);
    const context = state.accumulatedContext;

    const stageInfos: WorkflowStageInfo[] = [
      makeStageInfo(node.id, node.label, "focus", `智能体节点: ${node.label}`),
      makeStageInfo(
        node.id,
        node.label,
        "building",
        `正在执行智能体 [${node.label}] (类型: ${agentType})...`,
      ),
    ];

    try {
      const model = createModelFromState(state.llmConfig, { temperature: 0.7 });
      const prompt = truncateText(
        `节点名称: ${node.label || node.id}\n节点类型: ${agentType}\n\n当前节点任务:\n${node.inputText || "无"}\n\n上游上下文:\n${context || "无"}`,
      );

      const response = await model.invoke([
        new SystemMessage(
          `${instruction}\n\n请严格围绕当前节点任务输出，必要时先给出结构化方案再给出细节。`,
        ),
        new HumanMessage(prompt),
      ]);

      const output = response.content as string || "智能体执行完成，无文本输出";
      stageInfos.push(
        makeStageInfo(node.id, node.label, "agent_output", output.slice(0, 200)),
      );

      return {
        accumulatedContext: output,
        nodeOutputs: { [node.id]: output },
        focusedNodeId: node.id,
        stageInfo: stageInfos,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "智能体执行失败";
      stageInfos.push(
        makeStageInfo(node.id, node.label, "agent_output", `错误: ${errorMsg}`),
      );

      return {
        accumulatedContext: `智能体执行出错: ${errorMsg}`,
        nodeOutputs: { [node.id]: `智能体执行出错: ${errorMsg}` },
        focusedNodeId: node.id,
        stageInfo: stageInfos,
      };
    }
  };
}

function createBranchNode(ctx: GraphBuildContext, node: WorkflowNode) {
  return async (state: WorkflowGraphStateType): Promise<Partial<WorkflowGraphStateType>> => {
    const context = state.accumulatedContext;
    const branchText = node.inputText || "";

    const stageInfos: WorkflowStageInfo[] = [
      makeStageInfo(node.id, node.label, "focus", `分支节点: ${node.label}`),
      makeStageInfo(node.id, node.label, "building", `正在评估分支: ${branchText}...`),
    ];

    try {
      const model = createModelFromState(state.llmConfig, { temperature: 0 });
      const response = await model.invoke([
        new SystemMessage(
          `你是一个分支评估智能体。你需要根据给定的上下文，判断是否满足指定的分支条件。
请只回答 "true" 或 "false"，不要输出其他内容。
- 如果分支条件满足，回答 "true"
- 如果分支条件不满足，回答 "false"`,
        ),
        new HumanMessage(truncateText(`分支条件: ${branchText}\n\n上下文:\n${context}`)),
      ]);

      const result = (response.content as string)?.trim() || "false";
      const taken = parseBooleanResult(result);

      stageInfos.push(
        makeStageInfo(node.id, node.label, "branch", `分支条件: ${branchText}, 结果: ${taken}`),
      );

      return {
        accumulatedContext: context,
        nodeOutputs: { [node.id]: taken ? "分支满足" : "分支不满足" },
        focusedNodeId: node.id,
        stageInfo: stageInfos,
        branchResults: { [node.id]: taken },
      };
    } catch {
      stageInfos.push(
        makeStageInfo(node.id, node.label, "branch", `分支条件: ${branchText}, 结果: false (评估失败)`),
      );

      return {
        accumulatedContext: context,
        nodeOutputs: { [node.id]: "分支不满足" },
        focusedNodeId: node.id,
        stageInfo: stageInfos,
        branchResults: { [node.id]: false },
      };
    }
  };
}

function createOutputNode(ctx: GraphBuildContext, node: WorkflowNode) {
  return async (state: WorkflowGraphStateType): Promise<Partial<WorkflowGraphStateType>> => {
    const outputContext = state.accumulatedContext;
    return {
      nodeOutputs: { [node.id]: outputContext },
      focusedNodeId: node.id,
      stageInfo: [
        makeStageInfo(node.id, node.label, "focus", `输出节点: ${node.label}`),
        makeStageInfo(node.id, node.label, "building", "收集输出结果..."),
      ],
    };
  };
}

// ======================== Branch Routing ========================
function createBranchRouter(ctx: GraphBuildContext, node: WorkflowNode) {
  return (state: WorkflowGraphStateType): string => {
    const taken = state.branchResults?.[node.id] ?? false;
    const targets = ctx.branchTargets.get(node.id);

    if (targets) {
      if (taken && targets.trueTargets.length > 0) {
        return targets.trueTargets[0];
      }
      if (!taken && targets.falseTargets.length > 0) {
        return targets.falseTargets[0];
      }
      // Fallback: pick whichever has targets
      if (targets.trueTargets.length > 0) return targets.trueTargets[0];
      if (targets.falseTargets.length > 0) return targets.falseTargets[0];
    }

    // Fallback: find any outgoing edge target
    const outEdges = ctx.edges.filter((e) => e.source === node.id);
    if (outEdges.length > 0) return outEdges[0].target;

    return "__end__";
  };
}

// ======================== Build Branch Targets ========================
function buildBranchTargets(ctx: GraphBuildContext): void {
  for (const node of ctx.nodes) {
    if (normalizeNodeType(node.type) !== "branch") continue;

    const outEdges = ctx.edges.filter((e) => e.source === node.id);
    const trueTargets: string[] = [];
    const falseTargets: string[] = [];

    for (const edge of outEdges) {
      if (isTrueBranchHandle(edge.sourceHandle) || isTrueBranchLabel(edge.label)) {
        trueTargets.push(edge.target);
      } else if (isFalseBranchHandle(edge.sourceHandle) || isFalseBranchLabel(edge.label)) {
        falseTargets.push(edge.target);
      } else {
        // Unlabeled edges: first goes to true, second to false (common pattern)
        if (trueTargets.length <= falseTargets.length) {
          trueTargets.push(edge.target);
        } else {
          falseTargets.push(edge.target);
        }
      }
    }

    ctx.branchTargets.set(node.id, { trueTargets, falseTargets });
  }
}

// ======================== Build Graph ========================
export function buildWorkflowGraph(payload: WorkflowRunPayload) {
  const nodes: WorkflowNode[] = payload.nodes;
  const edges: WorkflowEdge[] = payload.edges;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const ctx: GraphBuildContext = {
    nodes,
    edges,
    nodeMap,
    branchTargets: new Map(),
    executionCount: new Map(),
    branchFalseRetries: new Map(),
  };

  // Pre-compute branch targets
  buildBranchTargets(ctx);

  // Build the state graph
  // We use `any` type for the graph builder because LangGraph's StateGraph
  // uses strict literal types for node names, which doesn't support dynamic
  // node names at runtime. This is the standard approach for dynamic graphs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let graph: any = new StateGraph(WorkflowGraphState);

  // Add each workflow node as a graph node
  for (const node of nodes) {
    const nodeType = normalizeNodeType(node.type);
    const nodeName = node.id;

    switch (nodeType) {
      case "input":
        graph = graph.addNode(nodeName, createInputNode(ctx, node));
        break;
      case "requirement":
        graph = graph.addNode(nodeName, createRequirementNode(ctx, node));
        break;
      case "agent":
        graph = graph.addNode(nodeName, createAgentNode(ctx, node));
        break;
      case "branch":
        graph = graph.addNode(nodeName, createBranchNode(ctx, node));
        break;
      case "output":
        graph = graph.addNode(nodeName, createOutputNode(ctx, node));
        break;
    }
  }

  // Find the input node(s) to connect from START
  const inputNodes = nodes.filter((n) => normalizeNodeType(n.type) === "input");
  for (const inputNode of inputNodes) {
    graph = graph.addEdge(START, inputNode.id);
  }

  // Add edges between nodes
  for (const node of nodes) {
    const nodeType = normalizeNodeType(node.type);

    if (nodeType === "branch") {
      // Branch nodes use conditional edges
      const outEdges = edges.filter((e) => e.source === node.id);
      if (outEdges.length === 0) {
        graph = graph.addEdge(node.id, END);
      } else {
        const targets = ctx.branchTargets.get(node.id);
        const allTargets = new Set<string>();
        if (targets) {
          targets.trueTargets.forEach((t) => allTargets.add(t));
          targets.falseTargets.forEach((t) => allTargets.add(t));
        }
        outEdges.forEach((e) => allTargets.add(e.target));

        // Build the routing map
        const routeMap: Record<string, string> = {};
        for (const target of allTargets) {
          routeMap[target] = target;
        }
        routeMap["__end__"] = END as unknown as string;

        graph = graph.addConditionalEdges(node.id, createBranchRouter(ctx, node), routeMap);
      }
    } else {
      // Non-branch nodes: add direct edges to successors
      const outEdges = edges.filter((e) => e.source === node.id);

      if (outEdges.length === 0) {
        // No outgoing edges -> connect to END
        graph = graph.addEdge(node.id, END);
      } else if (outEdges.length === 1) {
        graph = graph.addEdge(node.id, outEdges[0].target);
      } else {
        // Multiple outgoing edges from a non-branch node:
        // Fan-out to all targets (parallel execution)
        for (const edge of outEdges) {
          graph = graph.addEdge(node.id, edge.target);
        }
      }
    }
  }

  return graph;
}

// ======================== Compile Graph ========================
const checkpointer = new MemorySaver();

export function compileWorkflowGraph(payload: WorkflowRunPayload) {
  const graph = buildWorkflowGraph(payload);
  return graph.compile({ checkpointer });
}
