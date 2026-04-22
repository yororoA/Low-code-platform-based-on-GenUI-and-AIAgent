import { Output } from "ai";
import { z } from "zod";

const interactionSlotSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigation"),
    target: z.string().describe("Target page identifier, e.g. 'detail-page', 'settings'"),
    description: z.string().describe("Description of the interaction, e.g. 'Click to view details'"),
    params: z.record(z.string(), z.string()).optional().describe("Route parameters"),
  }),
  z.object({
    type: z.literal("state-change"),
    stateKey: z.string().describe("State key name, e.g. 'isExpanded', 'isActive'"),
    description: z.string().describe("Description of the interaction"),
    effects: z.array(z.object({
      targetId: z.string().describe("ID of the affected node"),
      action: z.enum(["show", "hide", "toggle-class", "replace-children", "update-props"]),
      className: z.string().optional().describe("className to toggle when action is toggle-class"),
      replacementTree: z.string().optional().describe("Replacement child tree JSON when action is replace-children"),
      propsDelta: z.record(z.string(), z.unknown()).optional().describe("Props to update when action is update-props"),
    })).describe("List of effects when this state changes"),
  }),
  z.object({
    type: z.literal("form-submit"),
    description: z.string().describe("Description of the form submission interaction"),
    fields: z.array(z.string()).describe("List of form field node IDs"),
    onSubmitDescription: z.string().describe("Description of what happens after form submission"),
  }),
  z.object({
    type: z.literal("modal-open"),
    description: z.string().describe("Description of the modal open interaction"),
    modalType: z.enum(["dialog", "sheet", "drawer", "popover"]),
    contentDescription: z.string().describe("Description of the modal content (generated on demand)"),
  }),
  z.object({
    type: z.literal("data-fetch"),
    description: z.string().describe("Description of the data fetch interaction"),
    mockData: z.string().optional().describe("Mock data for preview"),
    onLoadEffects: z.array(z.object({
      targetId: z.string(),
      action: z.enum(["show", "hide", "toggle-class", "replace-children", "update-props"]),
      className: z.string().optional(),
      replacementTree: z.string().optional(),
      propsDelta: z.record(z.string(), z.unknown()).optional(),
    })).describe("Effects to apply after data loads"),
  }),
  z.object({
    type: z.literal("custom"),
    description: z.string().describe("Description of the custom interaction"),
  }),
]);

export const outputSchemas = {
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
        "- For interactive elements (Button, TabsTrigger, Input, etc.), add an 'interaction' field to the node.",
      ].join("\n")),
      styleSummary: z.string()
        .describe("A text summary of the style design suggestions for the entire UI, which will be passed to the style agent for styling."),
      interactions: z.array(z.object({
        nodeId: z.string().describe("The node ID this interaction is bound to"),
        slot: interactionSlotSchema.describe("The interaction slot definition"),
      })).optional().describe("List of interaction definitions for interactive elements"),
      pages: z.array(z.object({
        id: z.string().describe("Page identifier"),
        name: z.string().describe("Human-readable page name"),
        description: z.string().describe("What this page shows"),
        isGenerated: z.boolean().default(false).describe("Whether the page UI has been generated"),
      })).optional().describe("Multi-page definitions for navigation targets"),
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
        }).refine((item) => item.className !== undefined || Boolean(item.classNames && Object.keys(item.classNames).length > 0), {
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
  interaction: Output.object({
    schema: z.object({
      uiTree: z.string().describe("UI tree DSL for the interaction result (new page, modal content, etc.)"),
      styleSummary: z.string().describe("Style summary for the interaction result"),
      interactions: z.array(z.object({
        nodeId: z.string(),
        slot: interactionSlotSchema,
      })).optional().describe("Interactions defined in the generated content"),
      pages: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        isGenerated: z.boolean().default(false),
      })).optional().describe("New page definitions if this interaction creates navigable pages"),
    })
  }),
  styleEdit: Output.object({
    schema: z.object({
      styleEdits: z.array(z.object({
        nodeId: z.string().describe("The node ID to apply the style edit to"),
        action: z.enum(["replace-class", "add-class", "remove-class"]).describe("The type of style edit action"),
        className: z.string().optional().describe("The className to apply"),
      })).describe("List of style edits to apply"),
    })
  }),
}