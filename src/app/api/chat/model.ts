import { wrapLanguageModel, ToolLoopAgent, tool } from 'ai';
import { deepseek } from "@ai-sdk/deepseek";
import { devToolsMiddleware } from '@ai-sdk/devtools';
import * as z from 'zod';
import { chatTools } from './tools';
import { interfaceStructureDesignAgentInstructions, textAgentInstructions } from './prompt';



const model = wrapLanguageModel({
  model: deepseek("deepseek-chat"),
  middleware: [
    devToolsMiddleware(),
  ]
});

const callOptions = z.object({
  agentLevel: z.enum(["admin", "structure", "worker"]).describe("The level of the agent in the hierarchy."),
  // instructions: z.string().describe("Instructions for the agent."),
});

const structureAgent = new ToolLoopAgent({
  model,
  tools: chatTools,
  callOptionsSchema: callOptions,
  prepareCall: ({ ...settings }) => ({
    ...settings,
    instructions: interfaceStructureDesignAgentInstructions,
    tools: chatTools,
  }),
});

const callStructureAgent = tool({
  description: "Calls the structure agent to design the interface structure and component layout.",
  inputSchema: z.object({
    textDescription: z
      .string()
      .describe("The text description based on which the structure agent will design the interface."),
  }),
  execute: async ({ textDescription }) => {
    const response = await structureAgent.generate({
      prompt: textDescription,
      options: {
        agentLevel: "structure",
      },
    });

    return `Structure agent response: ${JSON.stringify(response.output ?? response.text ?? "")}`;
  },
});

export const agents = new ToolLoopAgent({
  model,
  tools: chatTools,
  callOptionsSchema: callOptions,
  prepareCall: ({ options, ...settings }) => {
    const level = options.agentLevel;
    const dynamicSettings = (() => {
      switch (level) {
        case "admin":
          return {
            instructions: textAgentInstructions,
            tools: {
              ...chatTools,
              'call-structure-agent': callStructureAgent,
            }
          }
        case "structure":
          return {
            instructions: interfaceStructureDesignAgentInstructions,
            tools: chatTools
          }
        case "worker":
          return {
            instructions: "You are the worker agent. Execute concrete implementation tasks accurately.",
            tools: chatTools
          }
        default:
          return {
            instructions: "You are a helpful agent.",
            tools: chatTools
          }
      }
    })();


    return {
      ...settings,
      ...dynamicSettings,
    }
  },
});