import { Output } from "ai";
import { z } from "zod";

export const outputSchemas = {
  // first level agent for text output & ui filt
  textAgentOutput: Output.object({
    schema: z.object({
      text: z.string().describe("The text to be sent back to the boss."),
      necessary: z.boolean().describe("Whether the ui is necessary for the boss understanding."),
      uiNeeds: z.array(z.string()).describe("A list of UI components that are needed."),
    }),
  }),
  
}


// 测试用
export const chatOutput = Output.object({
  schema: z.object({
    text: z.string().describe("The text to be sent back to the user."),
    toolCalled: z.array(z.string()).describe("A list of tools that were called."),
    // a: z.string().optional().describe("An optional field for demonstration purposes."),
  }),
});
