import { wrapLanguageModel, ToolLoopAgent, tool } from 'ai';
import { deepseek } from "@ai-sdk/deepseek";
import { devToolsMiddleware } from '@ai-sdk/devtools';
import * as z from 'zod';
import { chatTools, callStructureAgent } from './tools';
import { interfaceStructureDesignAgentInstructions, textAgentInstructions, interfaceStylingAgentInstructions } from './prompt';
import { outputSchemas } from './schema';


const model = wrapLanguageModel({
  model: deepseek("deepseek-chat"),
  middleware: [
    devToolsMiddleware(),
  ]
});

// admin agent
export const adminAgent = new ToolLoopAgent({
  model,
  instructions: textAgentInstructions,
  output: outputSchemas.admin,
  tools: {
    ...chatTools,
    'call-structure-agent': callStructureAgent,
  },
  toolChoice: 'required'
})

// structure agent
export const structureAgent = new ToolLoopAgent({
  model,
  output: outputSchemas.structure,
  callOptionsSchema: z.object({
    uiProvided: z.array(z.string()).describe('A list of UI components that are provided.')
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `
      ${interfaceStructureDesignAgentInstructions}\n

      - The UI you can use:
      ${options.uiProvided?.join(", ") || "None"}
    `,
  }),
});

// style agent
export const styleAgent = new ToolLoopAgent({
  model,
  output: outputSchemas.style,
  callOptionsSchema: z.object({
    uiTree: z.string().describe("The UI tree provided.")
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `
      ${interfaceStylingAgentInstructions}\n

      - The UI tree provided:
      ${options.uiTree || "None"}
    `,
  }),
});