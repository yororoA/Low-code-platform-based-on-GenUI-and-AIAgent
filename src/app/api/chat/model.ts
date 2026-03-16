import { wrapLanguageModel, ToolLoopAgent, tool } from 'ai';
import { deepseek } from "@ai-sdk/deepseek";
import { devToolsMiddleware } from '@ai-sdk/devtools';
import * as z from 'zod';
import { chatTools } from './tools';
import { interfaceStructureDesignAgentInstructions, textAgentInstructions } from './prompt';
import { outputSchemas } from './schema';


const model = wrapLanguageModel({
  model: deepseek("deepseek-chat"),
  middleware: [
    devToolsMiddleware(),
  ]
});

// options for agents
const callOptions = z.object({
  agentLevel: z.enum(["admin", "structure", "worker"])
    .describe("The level of the agent in the hierarchy."),
  tools: z.record(z.string(), z.any())
    .optional().describe("A record of tools that the agent can use, which can be dynamically passed in based on the context.")
  // instructions: z.string().describe("Instructions for the agent."),
});

// structure agent
export const structureAgent = new ToolLoopAgent({
  model,
  tools: chatTools,
  callOptionsSchema: callOptions,
  prepareCall: ({ ...settings }) => ({
    ...settings,
    instructions: interfaceStructureDesignAgentInstructions,
    tools: chatTools,
  }),
});

// agents classifier
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
            output: outputSchemas.textAgentOutput,
            tools: options.tools ?
              {
                ...chatTools,
                // 'call-structure-agent': callStructureAgent,
              } : { ...options.tools },
            toolChoice: options.tools ? 'auto':'required',
          }
        case "structure":
          return {
            instructions: interfaceStructureDesignAgentInstructions,
            // output:,
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
            // output:,
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