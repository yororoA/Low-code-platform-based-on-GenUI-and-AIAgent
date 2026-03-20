import { wrapLanguageModel, ToolLoopAgent, InferAgentUIMessage } from 'ai';
import { deepseek } from "@ai-sdk/deepseek";
import { devToolsMiddleware } from '@ai-sdk/devtools';
import * as z from 'zod';
import { chatTools } from './tools';
import { interfaceStructureDesignAgentInstructions, textAgentInstructions, interfaceStylingAgentInstructions } from './prompt';
import { outputSchemas } from './schema';
import { componentsMeta } from './components-meta';


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
    // 'call-structure-agent(no stream)': callStructureAgent_Usual,
    // 'call-structure-agent(stream)': callStructureAgent_Stream,
  },
  toolChoice: 'auto'
});
export type AdminAgentMessage = InferAgentUIMessage<typeof adminAgent>;

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

      - The schema of each UI component you should follow when designing the UI structure:
      ${Object.entries(componentsMeta).map(([name, { description, propsSchema, dslExample }]) => `- ${name}: ${description}\nSchema:\n${propsSchema}\nExample:\n${dslExample}\n`).join("\n\n")}

      - For each UI component you choose to use, if the UI could be further enhanced with styles, please specify the UI with a unique id.
      - After structuring the UI, please also provide a text summarty of the style design suggestions for the entire UI, which will be passed to the style agent for styling.
      `,
  }),
});

// style agent
export const styleAgent = new ToolLoopAgent({
  model,
  output: outputSchemas.style,
  instructions: "Check the UI tree provided to you, then using TailwindCss to design the styles those are exposed by className or classNames in the UI tree.",
  callOptionsSchema: z.object({
    uiTree: z.string().describe("The UI tree provided."),
    styleSummary: z.string().describe("A text summary of the style design suggestions for the entire UI."),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `
      ${interfaceStylingAgentInstructions}\n

      - The UI tree provided:
      ${options.uiTree || "None"}

      - The style summary provided by the structure agent for your reference:
      ${options.styleSummary || "None"}

      IMPORTATN: ${settings.instructions}
    `,
  }),
});