import { convertToModelMessages, createUIMessageStreamResponse, createUIMessageStream, type UIMessage } from "ai"
import { adminAgent } from "./model"
import { callAlignmentAgent, callStructureAgent_Stream, callStyleAgent } from "./tools";
import { z } from "zod";

type AlignmentResult = Awaited<ReturnType<typeof callAlignmentAgent>>;
type AdminToolOutput = {
  text: string;
  necessary: boolean;
  uiDescription: string;
  uiNeeds: string[];
};

const adminToolOutputSchema = z.object({
  text: z.string(),
  necessary: z.boolean(),
  uiDescription: z.string(),
  uiNeeds: z.array(z.string()),
});

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return !!value && typeof (value as PromiseLike<unknown>).then === "function";
}

function tryParseAdminToolOutput(payload: unknown): AdminToolOutput | null {
  if (typeof payload === "string") {
    try {
      const parsedJson = JSON.parse(payload);
      const parsed = adminToolOutputSchema.safeParse(parsedJson);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  const parsed = adminToolOutputSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

async function collectAdminToolOutputDeep(root: unknown): Promise<AdminToolOutput | null> {
  const queue: unknown[] = [root];
  const visited = new WeakSet<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null) continue;

    if (isPromiseLike(current)) {
      try {
        queue.push(await current);
      } catch {
        // ignore rejected nested promises and continue probing other branches
      }
      continue;
    }

    const direct = tryParseAdminToolOutput(current);
    if (direct) return direct;

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item);
      continue;
    }

    if (typeof current !== "object") continue;

    const obj = current as Record<string, unknown>;
    if (visited.has(obj)) continue;
    visited.add(obj);

    const toolTag = obj.type;
    const toolName = obj.toolName ?? obj.tool ?? obj.name;
    const looksLikeShowResponseToolCall =
      toolTag === "tool-showResponse" ||
      toolName === "showResponse" ||
      (toolTag === "tool-call" && toolName === "showResponse");

    if (looksLikeShowResponseToolCall) {
      const candidates = [obj.input, obj.args, obj.arguments, obj.output];
      for (const candidate of candidates) {
        const parsed = tryParseAdminToolOutput(candidate);
        if (parsed) return parsed;
        if (candidate != null) queue.push(candidate);
      }
    }

    for (const value of Object.values(obj)) {
      queue.push(value);
    }
  }

  return null;
}

async function extractAdminToolOutput(streamResult: unknown): Promise<AdminToolOutput | null> {
  if (!streamResult || typeof streamResult !== "object") return null;
  const result = streamResult as Record<string, unknown>;

  const likelyContainers = [
    streamResult,
    result.resp,
    result.response,
    result.output,
    result.messages,
    result.steps,
  ];

  for (const container of likelyContainers) {
    const parsed = await collectAdminToolOutputDeep(container);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * 仅保留结构阶段违规：
 * - stage=structure 参与阻断
 * - style/data/interaction 在本阶段只做参考，不阻断结构流转
 */
function normalizeAlignmentForStructureStage(alignment: AlignmentResult) {
  const violations = alignment?.violations || [];
  const structureScopedViolations = violations.filter((v) => {
    return v.stage === "structure";
  });

  return {
    ...alignment,
    violations: structureScopedViolations,
    verdict: (structureScopedViolations.length === 0 ? "pass" : "retry") as "pass" | "retry",
  };
}


export async function POST(req: Request) {
  // 1) 读取 UI 消息并转换为模型输入消息
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages, {
    ignoreIncompleteToolCalls: true, // to avoid errors when tool calls are incomplete
  });

  // 2) 以 SSE 方式连续输出多代理结果
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        // 结构代理最多重试次数（包含首次生成）
        const MAX_STRUCTURE_ATTEMPTS = 3;

        // Level 1: admin 代理决定是否需要 UI，以及候选组件
        const levelONEresp = await adminAgent.stream({
          messages: modelMessages,
        });
        // 把 admin 代理的流式输出直接透传给前端
        await writer.merge(levelONEresp.toUIMessageStream());

        const levelONEoutput = await extractAdminToolOutput(levelONEresp);
        if (!levelONEoutput) {
          const parseFailId = `admin-parse-failed-${Date.now()}`;
          writer.write({ type: "text-start", id: parseFailId });
          writer.write({
            type: "text-delta",
            id: parseFailId,
            delta: "Admin tool output not found or invalid. Please ensure showResponse tool is called with valid input.",
          });
          writer.write({ type: "text-end", id: parseFailId });
          return;
        }
        // Level 2: 仅在必要时进入结构设计
        if (levelONEoutput.necessary && levelONEoutput.uiNeeds.length > 0) {
          const adminInfoId = `admin-info-${Date.now()}`;
          writer.write({ type: "text-start", id: adminInfoId });
          writer.write({
            type: "text-delta",
            id: adminInfoId,
            delta: `Admin agent determined that UI is necessary with needs: ${levelONEoutput.uiNeeds.join(", ")}`,
          });
          writer.write({ type: "text-end", id: adminInfoId });

          // 初始结构提示词：来自 admin 的 uiDescription
          let structurePrompt = levelONEoutput.uiDescription;
          let levelTWOoutput: { uiTree: string; styleSummary: string } | null = null;
          let finalAlignment: Awaited<ReturnType<typeof callAlignmentAgent>> | null = null;

          // 结构生成 + 对齐审查闭环
          for (let attempt = 1; attempt <= MAX_STRUCTURE_ATTEMPTS; attempt++) {
            const structureResp = await callStructureAgent_Stream({
              textDescription: structurePrompt,
              uiNeeds: levelONEoutput.uiNeeds
            });
            // 透传结构代理流式输出
            await writer.merge(structureResp.stream());

            try {
              levelTWOoutput = await structureResp.resp.output;
            } catch {
              levelTWOoutput = null;
            }

            const currentUiTree = levelTWOoutput?.uiTree
              ? (typeof levelTWOoutput.uiTree === 'string' ? levelTWOoutput.uiTree : JSON.stringify(levelTWOoutput.uiTree))
              : "";

            let rawAlignment: AlignmentResult;
            try {
              if (!currentUiTree) throw new Error("uiTree is missing");
              // Level 2.5: critic 对 uiDescription 与 uiTree 做一致性评估
              rawAlignment = await callAlignmentAgent({
                uiDescription: levelONEoutput.uiDescription,
                uiNeeds: levelONEoutput.uiNeeds,
                uiTree: currentUiTree,
              });
            } catch (error) {
              // critic 异常时降级为“可重试的结构错误”，避免整条请求中断
              rawAlignment = {
                alignmentScore: 0,
                verdict: "retry",
                violations: [
                  {
                    code: "DSL_INVALID",
                    stage: "structure",
                    severity: "high",
                    message: `Alignment critic failed to return valid structured output: ${error instanceof Error ? error.message : "unknown error"}`,
                    suggestion: "Regenerate uiTree with strict JSON schema compliance, unique ids, and valid violation fields.",
                  },
                ],
                retryPrompt: "Regenerate uiTree strictly as valid JSON and ensure structure semantics match uiDescription.",
              };
            }
            const alignment = normalizeAlignmentForStructureStage(rawAlignment);
            finalAlignment = alignment;

            // 输出本轮对齐结果摘要，便于前端观测重试过程
            const alignmentId = `alignment-info-${Date.now()}-${attempt}`;
            writer.write({ type: "text-start", id: alignmentId });
            writer.write({
              type: "text-delta",
              id: alignmentId,
              delta: `Alignment critic score: ${alignment.alignmentScore}/100, verdict: ${alignment.verdict}, violations: ${alignment.violations.length}`,
            });
            if (alignment.violations.length > 0) {
              writer.write({
                type: "text-delta",
                id: alignmentId,
                delta: `\nViolations: ${alignment.violations
                  .map((v, idx) => `${idx + 1}) [${v.severity}] ${v.code}: ${v.message}`)
                  .join(" | ")}`,
              });
            }
            writer.write({ type: "text-end", id: alignmentId });

            // 结构通过则结束重试
            if (alignment.verdict === "pass") {
              break;
            }

            if (attempt < MAX_STRUCTURE_ATTEMPTS) {
              // 把“上一版 uiTree + 违规详情 + retryPrompt”拼成下一轮修复提示
              const violationHints = alignment.violations
                ?.map((v, idx) => `${idx + 1}. (${v.code}/${v.severity}) ${v.message} -> ${v.suggestion}`)
                .join("\n");

              structurePrompt = `${levelONEoutput.uiDescription}

[Previous uiTree - revise instead of rewriting blindly]
${currentUiTree || "No valid uiTree generated."}

[Alignment Violations - must fix all]
${violationHints || "None"}

[Alignment Fix Guidance]
${alignment.retryPrompt || "Please generate a valid structure."}`;
            }
          }

          if (!levelTWOoutput || !levelTWOoutput.uiTree) {
            throw new Error("Structure generation failed after alignment loop.");
          }

          // 对齐未通过则直接停止，不进入样式阶段
          if (!finalAlignment || finalAlignment.verdict !== "pass") {
            const failId = `alignment-failed-${Date.now()}`;
            writer.write({ type: "text-start", id: failId });
            writer.write({
              type: "text-delta",
              id: failId,
              delta: `Alignment not passed after ${MAX_STRUCTURE_ATTEMPTS} attempts. Skip style stage to avoid propagating misaligned UI.`,
            });
            writer.write({ type: "text-end", id: failId });
            return;
          }

          // Level 3: 结构通过后再进入样式设计
          const styleResp = await callStyleAgent(
            typeof levelTWOoutput.uiTree === 'string' ? levelTWOoutput.uiTree : JSON.stringify(levelTWOoutput.uiTree),
            levelTWOoutput.styleSummary
          );
          // 透传样式代理流式输出
          await writer.merge(styleResp.stream());

          const styles = (await styleResp.resp.output).styles;
          // TODO: persist/apply generated styles to storage or downstream renderer.
          console.log("generated styles", styles);
        }


      }
    })
  })














  // return levelONEresp.toUIMessageStreamResponse({
  //   originalMessages: messages,
  //   onFinish: async ({ messages: uiMessages, responseMessage, isAborted, finishReason }) => {
  //     if (isAborted) {
  //       return
  //     }
  //     // 取出agent的输出，判断是否需要UI
  //     // const agentOutput = uiMessages[uiMessages.length - 1];
  //     // if (agentOutput?.necessary && agentOutput.uiNeeds.length > 0) {
  //     //   // 如果需要UI，则调用structure agent进行设计
  //     //   const structureResp = await structureAgent.generate({
  //     //     prompt: `
  //     //       - It is determined that the boss needs a UI for better understanding.
  //     //       - The following is the text response and the list of needed UI components that the boss requires:
  //     //         - text: ${agentOutput.text}
  //     //         - uiNeeds: ${agentOutput.uiNeeds.join(", ")}
  //     //       - Based on this information, please call the structure agent to design the structure of the UI and the layout of the components.
  //     //     `,
  //     //   options: {                       
  //     //     agentLevel: "admin",
  //     //   }
  //     //   });
  //     // }

  //     // Stream is fully generated at this point. Place persistence/logging/analytics here.
  //     console.log("agent stream finished", {
  //       finishReason,
  //       responseMessageId: responseMessage.id,
  //       totalMessages: uiMessages.length,
  //     })
  //   },
  // });
}
