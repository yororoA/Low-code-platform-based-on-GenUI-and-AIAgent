import { Output } from "ai";
import { z } from "zod";

export const outputSchemas = {
  // first level agent for text output & ui filt
  admin: Output.object({
    schema: z.object({
      text: z.string().describe("The text to be sent back to the boss."),
      necessary: z.boolean().describe("Whether the ui is necessary for the boss understanding."),
      uiDescription: z.string().describe('The description of the interface needed.'),
      uiNeeds: z.array(z.string()).describe("A list of required business-intent components selected from supported metadata names."),
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
      styleSummary: z.string()
        .describe("A text summary of the style design suggestions for the entire UI, which will be passed to the style agent for styling."),
    })
  }),
  style: Output.object({
    schema: z.object({
      styles: z.array(
        z.object({
          id: z.string()
            .describe('The id of the component that the style is for. It should match the id in the UI tree.'),
          className: z.string().optional()
            .describe("Optional root-level Tailwind CSS class names for the component. Example: 'bg-blue-500 text-white p-4 rounded'."),
          classNames: z.record(z.string(), z.string()).optional()
            .describe("Optional slot-level Tailwind class map for components that support classNames (e.g. DayPicker classNames)."),
        }).refine((item) => Boolean(item.className) || Boolean(item.classNames && Object.keys(item.classNames).length > 0), {
          message: "Each style item must provide at least one of className or classNames.",
        })
      )
    })
  }),
  alignment: Output.object({
    schema: z.object({
      alignmentScore: z.number().min(0).max(100)
        .describe("Alignment score between uiDescription and uiTree. 0 means totally mismatched, 100 means fully aligned."),
      verdict: z.enum(["pass", "retry"]) 
        .describe("pass if the structure is acceptable; retry if it should be regenerated."),
      violations: z.array(z.object({
        code: z.enum([
          "NEED_NOT_COVERED",
          "LAYOUT_MISMATCH",
          "INFORMATION_INCOMPLETENESS",
          "DSL_INVALID",
          "STYLE_ONLY_FEEDBACK",
          "OTHER",
        ]).describe("Stable violation code for deterministic routing logic."),
        stage: z.enum(["structure", "style", "data", "interaction"])
          .describe("Which stage this violation belongs to. Only structure should block structure pass."),
        severity: z.enum(["low", "medium", "high"]),
        message: z.string().describe("Human-readable violation detail."),
        suggestion: z.string().describe("Actionable fix suggestion for structure regeneration."),
      })),
      retryPrompt: z.string()
        .describe("A concise prompt fragment that can be appended to the structure agent input for the next retry."),
    })
  }),
}