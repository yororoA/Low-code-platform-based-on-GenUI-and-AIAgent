import { ToolLoopAgent, wrapLanguageModel } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { type WorkflowRunPayload, type WorkflowNodeType, type AgentType } from '@/types';

const model = wrapLanguageModel({
  model: deepseek('deepseek-chat'),
  middleware: process.env.NODE_ENV === 'development'
    ? [(await import('@ai-sdk/devtools')).devToolsMiddleware()]
    : [],
});

type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  inputText: string;
  agentType?: AgentType;
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

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

const MAX_WORKFLOW_STEPS = 120;
const MAX_NODE_EXECUTIONS = 24;
const MAX_BRANCH_FALSE_RETRIES = 12;
const MAX_CONTEXT_LENGTH = 12000;

function normalizeNodeType(type: WorkflowNodeType): Exclude<WorkflowNodeType, 'condition'> {
  return type === 'condition' ? 'branch' : type;
}

function truncateText(text: string, maxLength: number = MAX_CONTEXT_LENGTH): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[上下文已截断，共${text.length}字符]`;
}

function mergeContexts(contexts: string[], fallback: string): string {
  const parts = contexts.filter((item) => typeof item === 'string' && item.trim().length > 0);
  if (parts.length === 0) return truncateText(fallback || '');
  return truncateText(parts.join('\n\n---\n\n'));
}

function getAgentInstruction(agentType: AgentType): string {
  return AGENT_INSTRUCTIONS[agentType] || AGENT_INSTRUCTIONS.review;
}

function getIncomingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter(e => e.target === nodeId);
}

function getOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter(e => e.source === nodeId);
}

function buildAdjacencyList(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    const neighbors = adj.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
  }

  return adj;
}

function canReachTarget(fromId: string, targetId: string, adjacency: Map<string, string[]>): boolean {
  if (fromId === targetId) return true;
  const stack = [fromId];
  const seen = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);

    for (const next of adjacency.get(current) || []) {
      if (next === targetId) return true;
      if (!seen.has(next)) stack.push(next);
    }
  }

  return false;
}

function isTrueBranchLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();
  return normalized.includes('成立') || normalized.includes('满足') || normalized === 'true' || normalized.includes('真');
}

function isFalseBranchLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.trim().toLowerCase();
  return normalized.includes('不成立') || normalized.includes('不满足') || normalized === 'false' || normalized.includes('假');
}

function isTrueBranchHandle(handle: string | null | undefined): boolean {
  return handle === 'cond-true';
}

function isFalseBranchHandle(handle: string | null | undefined): boolean {
  return handle === 'cond-false';
}

function pickBranchTargets(
  nodeId: string,
  outgoingEdges: WorkflowEdge[],
  taken: boolean,
  adjacency: Map<string, string[]>,
  executionCount: Map<string, number>,
): string[] {
  if (outgoingEdges.length === 0) return [];
  if (outgoingEdges.length === 1) return [outgoingEdges[0].target];

  const trueLabelEdges = outgoingEdges.filter((edge) => isTrueBranchLabel(edge.label));
  const falseLabelEdges = outgoingEdges.filter((edge) => isFalseBranchLabel(edge.label));
  const trueHandleEdges = outgoingEdges.filter((edge) => isTrueBranchHandle(edge.sourceHandle));
  const falseHandleEdges = outgoingEdges.filter((edge) => isFalseBranchHandle(edge.sourceHandle));

  if (trueHandleEdges.length > 0 || falseHandleEdges.length > 0) {
    const preferredByHandle = taken ? trueHandleEdges : falseHandleEdges;
    const fallbackByHandle = taken ? falseHandleEdges : trueHandleEdges;
    const selectedByHandle = preferredByHandle.length > 0 ? preferredByHandle : fallbackByHandle;
    if (selectedByHandle.length > 0) {
      return selectedByHandle.map((edge) => edge.target);
    }
  }

  if (trueLabelEdges.length > 0 || falseLabelEdges.length > 0) {
    const preferredByLabel = taken ? trueLabelEdges : falseLabelEdges;
    const fallbackByLabel = taken ? falseLabelEdges : trueLabelEdges;
    const selectedByLabel = preferredByLabel.length > 0 ? preferredByLabel : fallbackByLabel;
    if (selectedByLabel.length > 0) {
      return selectedByLabel.map((edge) => edge.target);
    }
  }

  const loopCandidates = outgoingEdges.filter((edge) => {
    const goesBackToBranch = canReachTarget(edge.target, nodeId, adjacency);
    const targetExecuted = (executionCount.get(edge.target) || 0) > 0;
    return goesBackToBranch || targetExecuted;
  });
  const forwardCandidates = outgoingEdges.filter((edge) => !loopCandidates.includes(edge));

  const preferred = taken ? loopCandidates : forwardCandidates;
  const fallback = taken ? forwardCandidates : loopCandidates;
  const selected = preferred.length > 0 ? preferred : fallback;

  return selected.map((edge) => edge.target);
}

async function executeAgentNode(
  node: WorkflowNode,
  context: string,
  send: (event: string, data: unknown) => void,
): Promise<string> {
  const agentType = node.agentType || 'review';
  const instruction = getAgentInstruction(agentType);

  send('status', { type: 'focus', nodeId: node.id });
  send('status', { type: 'building', message: `正在执行智能体 [${node.label}] (类型: ${agentType})...` });

  const agent = new ToolLoopAgent({
    model,
    instructions: `${instruction}\n\n请严格围绕当前节点任务输出，必要时先给出结构化方案再给出细节。`,
  });

  try {
    const prompt = truncateText(`节点名称: ${node.label || node.id}\n节点类型: ${agentType}\n\n当前节点任务:\n${node.inputText || '无'}\n\n上游上下文:\n${context || '无'}`);
    const response = await agent.generate({
      prompt,
    });

    const output = response.text || '智能体执行完成，无文本输出';
    send('status', { type: 'agent_output', nodeId: node.id, output: output.slice(0, 200) });
    return output;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '智能体执行失败';
    send('status', { type: 'agent_output', nodeId: node.id, output: `错误: ${errorMsg}` });
    return `智能体执行出错: ${errorMsg}`;
  }
}

function parseBooleanResult(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  if (/^true\b/.test(normalized)) return true;
  if (/^false\b/.test(normalized)) return false;
  if (/\btrue\b/.test(normalized) && !/\bfalse\b/.test(normalized)) return true;
  if (/\bfalse\b/.test(normalized) && !/\btrue\b/.test(normalized)) return false;
  return normalized.includes('满足') || normalized.includes('成立') || normalized.includes('是');
}

async function evaluateBranch(
  branchText: string,
  context: string,
  send: (event: string, data: unknown) => void,
): Promise<boolean> {
  send('status', { type: 'building', message: `正在评估分支: ${branchText}...` });

  const conditionAgent = new ToolLoopAgent({
    model,
    instructions: `你是一个分支评估智能体。你需要根据给定的上下文，判断是否满足指定的分支条件。
请只回答 "true" 或 "false"，不要输出其他内容。
- 如果分支条件满足，回答 "true"
- 如果分支条件不满足，回答 "false"`,
  });

  try {
    const response = await conditionAgent.generate({
      prompt: truncateText(`分支条件: ${branchText}\n\n上下文:\n${context}`),
    });

    const result = response.text?.trim() || 'false';
    const taken = parseBooleanResult(result);
    send('status', { type: 'branch', branch: branchText, condition: branchText, taken });
    return taken;
  } catch {
    send('status', { type: 'branch', branch: branchText, condition: branchText, taken: false });
    return false;
  }
}

export async function POST(req: Request) {
  const payload: WorkflowRunPayload = await req.json();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* controller may be closed */ }
      };

      const nodes: WorkflowNode[] = payload.nodes;
      const edges: WorkflowEdge[] = payload.edges;
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      try {
        send('status', { type: 'building', message: '正在构建 Agent 架构...' });

        const inputNode = nodes.find((n) => n.type === 'input');
        if (!inputNode) {
          send('error', { message: '未找到输入节点' });
          controller.close();
          closed = true;
          return;
        }

        send('status', { type: 'building', message: 'Agent 架构构建完成，开始执行...' });

        const adjacency = buildAdjacencyList(nodes, edges);
        const nodeOutputs = new Map<string, string>();
        let accumulatedContext = inputNode.inputText || '';

        const executionCount = new Map<string, number>();
        const branchFalseRetries = new Map<string, number>();
        const runQueue: string[] = [inputNode.id];
        const inQueue = new Set<string>([inputNode.id]);

        const enqueue = (nodeId: string) => {
          if (!nodeMap.has(nodeId)) return;
          if (inQueue.has(nodeId)) return;
          runQueue.push(nodeId);
          inQueue.add(nodeId);
        };

        let steps = 0;
        while (runQueue.length > 0) {
          if (steps++ > MAX_WORKFLOW_STEPS) {
            throw new Error(`执行步骤超过上限(${MAX_WORKFLOW_STEPS})，可能存在未收敛的循环，请检查分支节点`);
          }

          const nodeId = runQueue.shift()!;
          inQueue.delete(nodeId);

          const node = nodeMap.get(nodeId);
          if (!node) continue;

          const runCount = (executionCount.get(nodeId) || 0) + 1;
          executionCount.set(nodeId, runCount);
          if (runCount > MAX_NODE_EXECUTIONS) {
            throw new Error(`节点 [${node.label || node.id}] 执行次数超过上限(${MAX_NODE_EXECUTIONS})，疑似无限循环`);
          }

          const incomingEdges = getIncomingEdges(nodeId, edges);
          const incomingContexts: string[] = [];
          for (const edge of incomingEdges) {
            const parentOutput = nodeOutputs.get(edge.source);
            if (parentOutput) incomingContexts.push(parentOutput);
          }

          const nodeType = normalizeNodeType(node.type);

          if (nodeType === 'input') {
            send('status', { type: 'focus', nodeId: node.id });
            const inputContext = node.inputText || '';
            nodeOutputs.set(node.id, inputContext);
            accumulatedContext = inputContext;
            for (const outEdge of getOutgoingEdges(node.id, edges)) {
              enqueue(outEdge.target);
            }
            continue;
          }

          if (nodeType === 'requirement') {
            send('status', { type: 'focus', nodeId: node.id });
            send('status', { type: 'building', message: `注入详细要求: ${node.inputText?.slice(0, 50)}...` });
            const upstream = mergeContexts(incomingContexts, accumulatedContext);
            const requirementContext = truncateText(
              `${upstream}\n\n[附加要求]\n${node.inputText || '无'}`,
            );
            accumulatedContext = requirementContext;
            nodeOutputs.set(nodeId, requirementContext);
            for (const outEdge of getOutgoingEdges(node.id, edges)) {
              enqueue(outEdge.target);
            }
          } else if (nodeType === 'agent') {
            const agentContext = mergeContexts(incomingContexts, accumulatedContext);
            const output = await executeAgentNode(node, agentContext, send);
            accumulatedContext = output;
            nodeOutputs.set(nodeId, output);
            for (const outEdge of getOutgoingEdges(node.id, edges)) {
              enqueue(outEdge.target);
            }
          } else if (nodeType === 'branch') {
            send('status', { type: 'focus', nodeId: node.id });
            const branchContext = mergeContexts(incomingContexts, accumulatedContext);
            const taken = await evaluateBranch(node.inputText, branchContext, send);

            nodeOutputs.set(nodeId, taken ? '分支满足' : '分支不满足');

            const outgoingEdges = getOutgoingEdges(nodeId, edges);
            if (!taken) {
              const retryCount = (branchFalseRetries.get(nodeId) || 0) + 1;
              branchFalseRetries.set(nodeId, retryCount);
              if (retryCount > MAX_BRANCH_FALSE_RETRIES) {
                throw new Error(`分支节点 [${node.label || node.id}] 连续未满足超过上限(${MAX_BRANCH_FALSE_RETRIES})，已停止执行`);
              }
            }

            accumulatedContext = branchContext;
            const targets = pickBranchTargets(nodeId, outgoingEdges, taken, adjacency, executionCount);
            for (const targetId of targets) {
              enqueue(targetId);
            }
          } else if (nodeType === 'output') {
            send('status', { type: 'focus', nodeId: node.id });
            send('status', { type: 'building', message: '收集输出结果...' });
            const outputContext = mergeContexts(incomingContexts, accumulatedContext);
            nodeOutputs.set(nodeId, outputContext);
          }
        }

        const outputNodes = nodes.filter((n) => normalizeNodeType(n.type) === 'output');
        const finalResults = outputNodes
          .map((n) => nodeOutputs.get(n.id))
          .filter(Boolean);

        send('done', { result: finalResults.join('\n\n---\n\n') || '工作流执行完成' });
      } catch (error) {
        send('error', { message: error instanceof Error ? error.message : '未知错误' });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
        closed = true;
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
