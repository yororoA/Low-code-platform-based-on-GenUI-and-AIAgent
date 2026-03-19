import { Output } from "ai";
import { z } from "zod";

export const outputSchemas = {
  // first level agent for text output & ui filt
  admin: Output.object({
    schema: z.object({
      text: z.string().describe("The text to be sent back to the boss."),
      necessary: z.boolean().describe("Whether the ui is necessary for the boss understanding."),
      uiDescription: z.string().describe('The description of the interface needed.'),
      uiNeeds: z.array(z.string()).describe("A list of UI components that are needed."),
    }),
  }),
  structure: Output.object({
    schema: z.object({
      uiTree: z.string().describe([
        "UI tree DSL as a JSON string (must be valid JSON, no markdown fences).",
        "Required shape:",
        "{",
        '  "type": "ComponentName",',
        '  "id": "unique-id",',
        '  "props": { "className": "...", "...": "..." },',
        '  "children": [ { "type": "...", "id": "...", "props": {}, "children": [] } ]',
        "}",
        "Rules:",
        "- Every component node must include a globally unique id.",
        "- Only use supported component names from provided metadata.",
        "- Keep props JSON-serializable.",
        "- children can be omitted or be an array of the same node shape.",
      ].join("\n")),
    })
  }),
  style: Output.object({
    schema: z.object({
      temp: z.string(),
      styles: z.array(
        z.object({
          id: z.string()
            .describe('The id of the component that the style is for. It should match the id in the UI tree.'),
          className: z.string()
            .describe("The Tailwind CSS class names to be applied to the component. It can be a combination of multiple classes. For example: 'bg-blue-500 text-white p-4 rounded'."),
        })
      )
    })
  }),
}