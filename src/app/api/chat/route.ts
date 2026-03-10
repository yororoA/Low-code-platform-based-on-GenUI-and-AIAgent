import { wrapLanguageModel, UIMessage, ToolLoopAgent, stepCountIs, createAgentUIStreamResponse } from 'ai';
import { deepseek } from "@ai-sdk/deepseek";
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { chatTools } from './tools';
import { chatInstructions, textAgentInstructions } from './prompt';
import { chatOutput } from './schema';


export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const model = wrapLanguageModel({
    model: deepseek("deepseek-chat"),
    middleware: [
      devToolsMiddleware(),
    ]
  });

  // 顶层文本回复agent, 并向下调用工具agent
  const textAgent = new ToolLoopAgent({
    model,
    instructions: textAgentInstructions,
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: chatInstructions,
    stopWhen: stepCountIs(20),
    output: chatOutput,
    tools: chatTools,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });






  // const result = streamText({
  //   model,
  //   messages: await convertToModelMessages(messages),
  // });

  // return result.toUIMessageStreamResponse();
}