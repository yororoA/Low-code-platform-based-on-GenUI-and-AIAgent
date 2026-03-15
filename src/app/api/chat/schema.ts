import { Output } from "ai";
import { z } from "zod";

export const chatOutput = Output.object({
  schema: z.object({
    text: z.string().describe("The text to be sent back to the user."),
    toolCalled: z.array(z.string()).describe("A list of tools that were called."),
    // a: z.string().optional().describe("An optional field for demonstration purposes."),
  }),
});
