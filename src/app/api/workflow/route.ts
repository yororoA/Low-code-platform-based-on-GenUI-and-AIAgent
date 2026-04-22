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
const MAX_CONDITION_FALSE_RETRIES = 12;

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

function pickConditionTargets(
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
    const goesBackToCondition = canReachTarget(edge.target, nodeId, adjacency);
    const targetExecuted = (executionCount.get(edge.target) || 0) > 0;
    return goesBackToCondition || targetExecuted;
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
    instructions: `${instruction}\n\n当前任务: ${node.inputText}`,
  });

  try {
    const response = await agent.generate({
      prompt: context || node.inputText,
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

async function evaluateCondition(
  conditionText: string,
  context: string,
  send: (event: string, data: unknown) => void,
): Promise<boolean> {
  send('status', { type: 'building', message: `正在评估条件: ${conditionText}...` });

  const conditionAgent = new ToolLoopAgent({
    model,
    instructions: `你是一个条件评估智能体。你需要根据给定的上下文，判断是否满足指定的条件。
请只回答 "true" 或 "false"，不要输出其他内容。
- 如果条件满足，回答 "true"
- 如果条件不满足，回答 "false"`,
  });

  try {
    const response = await conditionAgent.generate({
      prompt: `条件: ${conditionText}\n\n上下文:\n${context}`,
    });

    const result = response.text?.trim().toLowerCase() || 'false';
    const taken = result.includes('true');
    send('status', { type: 'branch', condition: conditionText, taken });
    return taken;
  } catch {
    send('status', { type: 'branch', condition: conditionText, taken: false });
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
        const conditionFalseRetries = new Map<string, number>();
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
            throw new Error(`执行步骤超过上限(${MAX_WORKFLOW_STEPS})，可能存在未收敛的循环，请检查条件节点`);
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

          if (node.type === 'input') {
            send('status', { type: 'focus', nodeId: node.id });
            const inputContext = node.inputText || '';
            nodeOutputs.set(node.id, inputContext);
            accumulatedContext = inputContext;
            for (const outEdge of getOutgoingEdges(node.id, edges)) {
              enqueue(outEdge.target);
            }
            continue;
          }

          if (node.type === 'requirement') {
            send('status', { type: 'focus', nodeId: node.id });
            send('status', { type: 'building', message: `注入详细要求: ${node.inputText?.slice(0, 50)}...` });
            const requirementContext = incomingContexts.length > 0
              ? `${incomingContexts.join('\n\n')}\n\n[附加要求]: ${node.inputText}`
              : node.inputText;
            accumulatedContext = requirementContext;
            nodeOutputs.set(nodeId, requirementContext);
            for (const outEdge of getOutgoingEdges(node.id, edges)) {
              enqueue(outEdge.target);
            }
          } else if (node.type === 'agent') {
            const agentContext = incomingContexts.length > 0
              ? incomingContexts.join('\n\n')
              : accumulatedContext;
            const output = await executeAgentNode(node, agentContext, send);
            accumulatedContext = output;
            nodeOutputs.set(nodeId, output);
            for (const outEdge of getOutgoingEdges(node.id, edges)) {
              enqueue(outEdge.target);
            }
          } else if (node.type === 'condition') {
            send('status', { type: 'focus', nodeId: node.id });
            const conditionContext = incomingContexts.length > 0
              ? incomingContexts.join('\n\n')
              : accumulatedContext;
            const taken = await evaluateCondition(node.inputText, conditionContext, send);

            nodeOutputs.set(nodeId, taken ? '条件满足' : '条件不满足');

            const outgoingEdges = getOutgoingEdges(nodeId, edges);
            if (!taken) {
              const retryCount = (conditionFalseRetries.get(nodeId) || 0) + 1;
              conditionFalseRetries.set(nodeId, retryCount);
              if (retryCount > MAX_CONDITION_FALSE_RETRIES) {
                throw new Error(`条件节点 [${node.label || node.id}] 连续未满足超过上限(${MAX_CONDITION_FALSE_RETRIES})，已停止执行`);
              }
            }

            accumulatedContext = conditionContext;
            const targets = pickConditionTargets(nodeId, outgoingEdges, taken, adjacency, executionCount);
            for (const targetId of targets) {
              enqueue(targetId);
            }
          } else if (node.type === 'output') {
            send('status', { type: 'focus', nodeId: node.id });
            send('status', { type: 'building', message: '收集输出结果...' });
            const outputContext = incomingContexts.length > 0
              ? incomingContexts.join('\n\n')
              : accumulatedContext;
            nodeOutputs.set(nodeId, outputContext);
          }
        }

        const outputNodes = nodes.filter((n) => n.type === 'output');
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
