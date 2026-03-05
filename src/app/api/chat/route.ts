import { wrapLanguageModel, Output, UIMessage, ToolLoopAgent, stepCountIs, tool, createAgentUIStreamResponse } from 'ai';
import { deepseek } from "@ai-sdk/deepseek";
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { z } from 'zod';


export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const model = wrapLanguageModel({
    model: deepseek("deepseek-chat"),
    middleware: [
      devToolsMiddleware(),
    ]
  });
  const instructions = `
  You are a helpful assistant that can use tools to answer questions. 
  Use the "print" tool to print messages and 
  the "randomNumber" tool to generate random numbers. 
  Always choose the most appropriate tool based on the user's query. 
  If you don't know the answer, use the tools to find it out.
  No matter how many times the same question is asked by the user, just do it like the first time, don't try to be smart.
  `;

  const agent = new ToolLoopAgent({
    model,
    instructions,
    stopWhen: stepCountIs(20),
    output: Output.object({
      schema: z.object({
        text: z.string().describe("The text to be sent back to the user."),
        toolCalled: z.array(z.string()).describe("A list of tools that were called."),
      })
    }),
    tools: {
      "print": tool({
        description: "Prints a message to the console.",
        inputSchema: z.object({
          message: z.string(),
        }),
        execute: async ({ message }) => {
          return "print-tool called: " + message;
        }
      }),
      "randomNumber": tool({
        description: "Generates a random number between 0 and 1.",
        inputSchema: z.object({}),
        execute: async () => {
          return "randomNumber-tool called: " + Math.random();
        }
      })
    },
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