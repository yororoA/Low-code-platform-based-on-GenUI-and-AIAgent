import { HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { componentsMetaByName } from "@/components/components-meta";
import { createStructuredModelFromState } from "./llm";
import {
  textAgentInstructions,
  interfaceStructureDesignAgentInstructions,
  interfaceStylingAgentInstructions,
  interfaceAlignmentCriticInstructions,
  interactionAgentInstructions,
} from "./prompt";
import type {
  ChatGraphStateType,
  AdminToolOutput,
  StructureOutput,
  AlignmentOutput,
  StyleOutput,
  InteractionOutput,
  StageInfoEntry,
} from "./state";

// ======================== Schemas ========================
const supportedUiNames = Object.keys(componentsMetaByName) as [string, ...string[]];
const strictUiNeedSchema = z.enum(supportedUiNames);

const adminOutputSchema = z.object({
  text: z.string().describe("The text to be sent back to the boss."),
  necessary: z.boolean().describe("Whether the ui is necessary for the boss understanding."),
  uiDescription: z.string().describe("The description of the interface needed."),
  uiNeeds: z.array(strictUiNeedSchema).describe("A list of required business-intent components selected from supported metadata names."),
});

const interactionSlotSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("navigation"),
    target: z.string(),
    description: z.string(),
    params: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal("state-change"),
    stateKey: z.string(),
    description: z.string(),
    effects: z.array(z.object({
      targetId: z.string(),
      action: z.enum(["show", "hide", "toggle-class", "replace-children", "update-props"]),
      className: z.string().optional(),
      replacementTree: z.string().optional(),
      propsDelta: z.record(z.string(), z.unknown()).optional(),
    })),
  }),
  z.object({
    type: z.literal("form-submit"),
    description: z.string(),
    fields: z.array(z.string()),
    onSubmitDescription: z.string(),
  }),
  z.object({
    type: z.literal("modal-open"),
    description: z.string(),
    modalType: z.enum(["dialog", "sheet", "drawer", "popover"]),
    contentDescription: z.string(),
  }),
  z.object({
    type: z.literal("data-fetch"),
    description: z.string(),
    mockData: z.string().optional(),
    onLoadEffects: z.array(z.object({
      targetId: z.string(),
      action: z.enum(["show", "hide", "toggle-class", "replace-children", "update-props"]),
      className: z.string().optional(),
      replacementTree: z.string().optional(),
      propsDelta: z.record(z.string(), z.unknown()).optional(),
    })),
  }),
  z.object({
    type: z.literal("custom"),
    description: z.string(),
  }),
]);

const structureOutputSchema = z.object({
  uiTree: z.string().describe("UI tree DSL as a JSON string"),
  styleSummary: z.string().describe("A text summary of the style design suggestions"),
  interactions: z.array(z.object({
    nodeId: z.string(),
    slot: interactionSlotSchema,
  })).optional().describe("List of interaction definitions"),
  pages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    isGenerated: z.boolean().default(false),
  })).optional().describe("Multi-page definitions"),
});

const alignmentOutputSchema = z.object({
  alignmentScore: z.number().min(0).max(100),
  verdict: z.enum(["pass", "retry"]),
  violations: z.array(z.object({
    code: z.enum(["NEED_NOT_COVERED", "LAYOUT_MISMATCH", "INFORMATION_INCOMPLETENESS", "DSL_INVALID", "STYLE_ONLY_FEEDBACK", "OTHER"]),
    stage: z.enum(["structure", "style", "data", "interaction"]),
    severity: z.enum(["low", "medium", "high"]),
    message: z.string(),
    suggestion: z.string(),
  })),
  retryPrompt: z.string(),
});

const styleOutputSchema = z.object({
  styles: z.array(
    z.object({
      id: z.string(),
      className: z.string().optional(),
      classNames: z.record(z.string(), z.string()).optional(),
    }).refine((item) => item.className !== undefined || Boolean(item.classNames && Object.keys(item.classNames).length > 0), {
      message: "Each style item must provide at least one of className or classNames.",
    })
  ),
});

const interactionOutputSchema = z.object({
  uiTree: z.string(),
  styleSummary: z.string(),
  interactions: z.array(z.object({
    nodeId: z.string(),
    slot: interactionSlotSchema,
  })).optional(),
  pages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    isGenerated: z.boolean().default(false),
  })).optional(),
});

// ======================== Helper ========================
const supportedComponentNameSet = new Set(Object.keys(componentsMetaByName));
const lowerCaseToComponentName = new Map(
  Object.keys(componentsMetaByName).map((name) => [name.toLowerCase(), name]),
);

function normalizeUiNeedsAgainstMeta(uiNeeds: string[]): {
  validNeeds: string[];
  droppedNeeds: string[];
} {
  const validNeeds: string[] = [];
  const droppedNeeds: string[] = [];
  const seen = new Set<string>();

  for (const rawNeed of uiNeeds) {
    const trimmedNeed = rawNeed.trim();
    if (!trimmedNeed) {
      droppedNeeds.push(rawNeed);
      continue;
    }
    const canonicalNeed = lowerCaseToComponentName.get(trimmedNeed.toLowerCase()) ?? trimmedNeed;
    if (!supportedComponentNameSet.has(canonicalNeed)) {
      droppedNeeds.push(rawNeed);
      continue;
    }
    if (!seen.has(canonicalNeed)) {
      seen.add(canonicalNeed);
      validNeeds.push(canonicalNeed);
    }
  }
  return { validNeeds, droppedNeeds };
}

function extractLastUserMessage(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i] instanceof HumanMessage) {
      const content = messages[i].content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        const textParts = content
          .filter((c): c is { type: "text"; text: string } => typeof c === "object" && c !== null && "type" in c && (c as { type: string }).type === "text")
          .map((c) => c.text);
        if (textParts.length > 0) return textParts.join("\n");
      }
      return JSON.stringify(content);
    }
  }
  return "";
}

// ======================== Admin Node ========================
const ADMIN_MAX_RETRIES = 2;

function validateAdminOutput(raw: unknown): AdminToolOutput | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.text !== "string") return null;
  if (typeof obj.necessary !== "boolean") return null;
  if (typeof obj.uiDescription !== "string") return null;
  if (!Array.isArray(obj.uiNeeds)) return null;
  return {
    text: obj.text,
    necessary: obj.necessary,
    uiDescription: obj.uiDescription,
    uiNeeds: obj.uiNeeds.filter((n: unknown) => typeof n === "string"),
  };
}

function buildFallbackAdminOutput(raw: unknown): AdminToolOutput {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    text: typeof obj.text === "string" ? obj.text : "I've processed your request.",
    necessary: false,
    uiDescription: "",
    uiNeeds: [],
  };
}

export async function adminNode(state: ChatGraphStateType): Promise<Partial<ChatGraphStateType>> {
  const stageInfo: StageInfoEntry[] = [
    { stage: "ADMIN", message: "Thinking for response...", timestamp: Date.now() },
  ];

  const model = createStructuredModelFromState(adminOutputSchema, state.llmConfig, { temperature: 0.7 });
  const systemMsg = new SystemMessage(textAgentInstructions);

  let output: AdminToolOutput | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= ADMIN_MAX_RETRIES; attempt++) {
    try {
      const response = await model.invoke([systemMsg, ...state.messages]);
      const validated = validateAdminOutput(response);
      if (validated) {
        output = validated;
        break;
      }
      const fallback = buildFallbackAdminOutput(response);
      if (fallback.text) {
        output = fallback;
        stageInfo.push({
          stage: "ADMIN",
          message: `Structured output validation failed on attempt ${attempt + 1}, recovered partial response.`,
          timestamp: Date.now(),
        });
        break;
      }
    } catch (err) {
      lastError = err;
      if (attempt < ADMIN_MAX_RETRIES) {
        stageInfo.push({
          stage: "ADMIN",
          message: `Attempt ${attempt + 1} failed, retrying...`,
          timestamp: Date.now(),
        });
      }
    }
  }

  if (!output) {
    const rawMsg = lastError instanceof Error ? lastError.message : "unknown error";
    return {
      error: `Admin agent failed after ${ADMIN_MAX_RETRIES + 1} attempts: ${rawMsg}`,
      stageInfo,
    };
  }

  // Validate and normalize uiNeeds
  let { validNeeds: normalizedUiNeeds, droppedNeeds } = normalizeUiNeedsAgainstMeta(output.uiNeeds || []);

  // Retry once if there are dropped needs
  if (output.necessary && droppedNeeds.length > 0) {
    stageInfo.push({
      stage: "ADMIN",
      message: `Found unsupported uiNeeds: ${droppedNeeds.join(", ")}. Retrying for strict supported-component output...`,
      timestamp: Date.now(),
    });

    const supportedNames = Object.keys(componentsMetaByName).join(", ");
    const retryConstraint = new SystemMessage(
      `STRICT RETRY FIX FOR uiNeeds:\n- Your previous uiNeeds included unsupported names: ${droppedNeeds.join(", ")}.\n- Re-run selection and output uiNeeds using ONLY exact names from supported components.\n- Supported component names (exact): ${supportedNames}`,
    );

    try {
      const retryResponse = await model.invoke([systemMsg, ...state.messages, retryConstraint]);
      const retryValidated = validateAdminOutput(retryResponse);
      const retryOutput = retryValidated ?? buildFallbackAdminOutput(retryResponse);
      if (retryOutput.uiNeeds) {
        const retryNormalized = normalizeUiNeedsAgainstMeta(retryOutput.uiNeeds);
        if (retryNormalized.validNeeds.length > 0) {
          output.uiNeeds = retryOutput.uiNeeds;
          normalizedUiNeeds = retryNormalized.validNeeds;
          droppedNeeds = retryNormalized.droppedNeeds;
        }
      }
    } catch {
      // Retry for uiNeeds is best-effort, keep original output
    }
  }

  if (droppedNeeds.length > 0) {
    stageInfo.push({
      stage: "ADMIN",
      message: `Dropped unsupported uiNeeds after validation: ${droppedNeeds.join(", ")}.`,
      timestamp: Date.now(),
    });
  }

  if (output.necessary && normalizedUiNeeds.length > 0) {
    stageInfo.push({
      stage: "ADMIN",
      message: `UI is necessary with needs: ${normalizedUiNeeds.join(", ")}`,
      timestamp: Date.now(),
    });
  } else if (output.necessary && normalizedUiNeeds.length === 0) {
    stageInfo.push({
      stage: "ADMIN",
      message: "UI was requested but no supported uiNeeds remained after validation. Skipping structure/style stages.",
      timestamp: Date.now(),
    });
  }

  return {
    adminOutput: output,
    normalizedUiNeeds,
    stageInfo,
  };
}

// ======================== Structure Node ========================
const NODE_MAX_RETRIES = 1;

async function invokeWithRetry<T>(
  model: ReturnType<typeof createStructuredModelFromState>,
  messages: Parameters<ReturnType<typeof createStructuredModelFromState>["invoke"]>[0],
  validate: (raw: unknown) => T | null,
  buildFallback: (raw: unknown) => T | null,
  stageInfo: StageInfoEntry[],
  nodeName: string,
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= NODE_MAX_RETRIES; attempt++) {
    try {
      const response = await model.invoke(messages);
      const validated = validate(response);
      if (validated) return validated;
      const fallback = buildFallback(response);
      if (fallback) {
        stageInfo.push({
          stage: nodeName,
          message: `Structured output validation failed on attempt ${attempt + 1}, recovered partial response.`,
          timestamp: Date.now(),
        });
        return fallback;
      }
    } catch (err) {
      lastError = err;
      if (attempt < NODE_MAX_RETRIES) {
        stageInfo.push({
          stage: nodeName,
          message: `Attempt ${attempt + 1} failed, retrying...`,
          timestamp: Date.now(),
        });
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${nodeName} agent failed after ${NODE_MAX_RETRIES + 1} attempts`);
}

export async function structureNode(state: ChatGraphStateType): Promise<Partial<ChatGraphStateType>> {
  const attempt = state.structureAttempt + 1;
  const MAX_ATTEMPTS = 10;

  const stageInfo: StageInfoEntry[] = [
    { stage: "STRUCTURE", message: `Structure generation attempt ${attempt} of ${MAX_ATTEMPTS}...`, timestamp: Date.now() },
  ];

  const model = createStructuredModelFromState(structureOutputSchema, state.llmConfig, { temperature: 0.7 });

  const uiProvided = state.normalizedUiNeeds;
  const componentsMetaStr = Object.entries(componentsMetaByName)
    .map(([, meta]) => {
      const m = meta as { description?: string; propsSchema?: unknown; dslExample?: unknown };
      return `- ${m.description || ""}\nSchema: ${JSON.stringify(m.propsSchema || {})}\nExample: ${JSON.stringify(m.dslExample || {})}`;
    })
    .join("\n\n");

  let structurePrompt = state.adminOutput?.uiDescription || "";

  // If this is a retry, include previous uiTree and violations
  if (attempt > 1 && state.structureOutput?.uiTree) {
    const violationHints = state.alignmentOutput?.violations
      ?.map((v, idx) => `${idx + 1}. (${v.code}/${v.severity}) ${v.message} -> ${v.suggestion}`)
      .join("\n");

    structurePrompt = `${state.adminOutput?.uiDescription || ""}

[Previous uiTree - revise instead of rewriting blindly]
${state.structureOutput.uiTree}

[Alignment Violations - must fix all]
${violationHints || "None"}

[Alignment Fix Guidance]
${state.alignmentOutput?.retryPrompt || "Please generate a valid structure."}`;
  }

  const systemMsg = new SystemMessage(
    `${interfaceStructureDesignAgentInstructions}\n\n- The UI you can use:\n${uiProvided.join(", ") || "None"}\n\n- The schema of each UI component:\n${componentsMetaStr}\n\n- Every node in uiTree MUST have a globally unique id.\n- Keep structure-stage classes minimal and layout-focused; leave visual polish to style stage.\n- After structuring the UI, provide a concise style summary for the style agent.`,
  );

  try {
    const output = await invokeWithRetry<StructureOutput>(
      model,
      [systemMsg, new HumanMessage(structurePrompt)],
      (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const obj = raw as Record<string, unknown>;
        if (typeof obj.uiTree !== "string" || !obj.uiTree) return null;
        return { uiTree: obj.uiTree, styleSummary: typeof obj.styleSummary === "string" ? obj.styleSummary : "" } as StructureOutput;
      },
      (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const obj = raw as Record<string, unknown>;
        if (typeof obj.uiTree === "string" && obj.uiTree) {
          return { uiTree: obj.uiTree, styleSummary: typeof obj.styleSummary === "string" ? obj.styleSummary : "" } as StructureOutput;
        }
        return null;
      },
      stageInfo,
      "STRUCTURE",
    );

    return {
      structureOutput: output,
      structureAttempt: attempt,
      stageInfo,
    };
  } catch (error) {
    return {
      structureAttempt: attempt,
      error: `Structure agent failed on attempt ${attempt}: ${error instanceof Error ? error.message : "unknown error"}`,
      stageInfo,
    };
  }
}

// ======================== Alignment Node ========================
export async function alignmentNode(state: ChatGraphStateType): Promise<Partial<ChatGraphStateType>> {
  const stageInfo: StageInfoEntry[] = [
    { stage: "ALIGNMENT", message: `Alignment analysis attempt ${state.structureAttempt}...`, timestamp: Date.now() },
  ];

  const model = createStructuredModelFromState(alignmentOutputSchema, state.llmConfig, { temperature: 0.3 });

  const currentUiTree = state.structureOutput?.uiTree || "";
  if (!currentUiTree) {
    return {
      alignmentOutput: {
        alignmentScore: 0,
        verdict: "retry",
        violations: [{
          code: "DSL_INVALID",
          stage: "structure",
          severity: "high",
          message: "uiTree is missing",
          suggestion: "Regenerate uiTree with valid JSON schema.",
        }],
        retryPrompt: "Regenerate uiTree strictly as valid JSON.",
      },
      stageInfo,
    };
  }

  const systemMsg = new SystemMessage(
    `${interfaceAlignmentCriticInstructions}\n\n- uiDescription:\n${state.adminOutput?.uiDescription || "None"}\n\n- uiNeeds:\n${state.normalizedUiNeeds.join(", ") || "None"}\n\n- uiTree:\n${currentUiTree}\n\n- Supported components:\n${Object.keys(componentsMetaByName).map((n) => `- ${n}`).join("\n")}\n\nIMPORTANT:\n- If alignmentScore < 85, verdict must be "retry".\n- Keep retryPrompt short, specific and directly actionable.`,
  );

  try {
    const response = await model.invoke([
      systemMsg,
      new HumanMessage("Check the alignment between uiDescription and uiTree."),
    ]);
    const output = response as unknown as AlignmentOutput;

    // Filter violations to only structure-stage blocking ones
    const structureScopedViolations = output.violations.filter((v) => v.stage === "structure");
    const normalizedOutput: AlignmentOutput = {
      ...output,
      violations: structureScopedViolations,
      verdict: structureScopedViolations.length === 0 ? "pass" : "retry",
    };

    stageInfo.push({
      stage: "ALIGNMENT",
      message: `Score: ${normalizedOutput.alignmentScore}/100, verdict: ${normalizedOutput.verdict}, violations: ${normalizedOutput.violations.length}`,
      timestamp: Date.now(),
    });

    if (normalizedOutput.verdict === "retry") {
      stageInfo.push({
        stage: "ALIGNMENT",
        message: "Alignment determined to retry.",
        timestamp: Date.now(),
      });
    }

    return {
      alignmentOutput: normalizedOutput,
      stageInfo,
    };
  } catch (error) {
    const fallbackAlignment: AlignmentOutput = {
      alignmentScore: 0,
      verdict: "retry",
      violations: [{
        code: "DSL_INVALID",
        stage: "structure",
        severity: "high",
        message: `Alignment critic failed: ${error instanceof Error ? error.message : "unknown error"}`,
        suggestion: "Regenerate uiTree with strict JSON schema compliance.",
      }],
      retryPrompt: "Regenerate uiTree strictly as valid JSON and ensure structure semantics match uiDescription.",
    };

    return {
      alignmentOutput: fallbackAlignment,
      stageInfo,
    };
  }
}

// ======================== Style Node ========================
export async function styleNode(state: ChatGraphStateType): Promise<Partial<ChatGraphStateType>> {
  const stageInfo: StageInfoEntry[] = [
    { stage: "STYLE", message: "Style generation...", timestamp: Date.now() },
  ];

  const model = createStructuredModelFromState(styleOutputSchema, state.llmConfig, { temperature: 0.7 });

  const uiTree = state.structureOutput?.uiTree || "";
  const styleSummary = state.structureOutput?.styleSummary || "";

  const systemMsg = new SystemMessage(
    `${interfaceStylingAgentInstructions}\n\n- The UI tree provided:\n${uiTree || "None"}\n\n- The style summary provided by the structure agent:\n${styleSummary || "None"}`,
  );

  try {
    const output = await invokeWithRetry<StyleOutput>(
      model,
      [systemMsg, new HumanMessage("Design the interface style based on the provided UI tree.")],
      (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const obj = raw as Record<string, unknown>;
        if (!Array.isArray(obj.styles)) return null;
        return { styles: obj.styles } as StyleOutput;
      },
      () => null,
      stageInfo,
      "STYLE",
    );

    return {
      styleOutput: output,
      stageInfo,
    };
  } catch (error) {
    return {
      error: `Style agent failed: ${error instanceof Error ? error.message : "unknown error"}`,
      stageInfo,
    };
  }
}

// ======================== Interaction Node ========================
export async function interactionNode(state: ChatGraphStateType): Promise<Partial<ChatGraphStateType>> {
  const stageInfo: StageInfoEntry[] = [
    { stage: "INTERACTION", message: "Generating interaction content...", timestamp: Date.now() },
  ];

  const model = createStructuredModelFromState(interactionOutputSchema, state.llmConfig, { temperature: 0.7 });
  const payload = state.interactionPayload;

  if (!payload) {
    return { error: "Interaction payload is missing", stageInfo };
  }

  const componentsMetaStr = Object.entries(componentsMetaByName)
    .map(([, meta]) => {
      const m = meta as { description?: string; propsSchema?: unknown; dslExample?: unknown };
      return `- ${m.description || ""}\nSchema: ${JSON.stringify(m.propsSchema || {})}\nExample: ${JSON.stringify(m.dslExample || {})}`;
    })
    .join("\n\n");

  const systemMsg = new SystemMessage(
    `${interactionAgentInstructions}\n\n- The interaction type: ${payload.type}\n- The interaction description: ${payload.description}\n- Available UI components: ${Object.keys(componentsMetaByName).join(", ")}\n\n- The schema of each UI component:\n${componentsMetaStr}\n\n- Current page context:\n${payload.currentPageContext || "None"}\n\n- Every node in uiTree MUST have a globally unique id.\n- For interactive elements, define interaction slots following the same rules as the structure agent.`,
  );

  try {
    const output = await invokeWithRetry<InteractionOutput>(
      model,
      [systemMsg, new HumanMessage(`Generate UI content for the "${payload.type}" interaction: ${payload.description}`)],
      (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const obj = raw as Record<string, unknown>;
        if (typeof obj.uiTree !== "string" || !obj.uiTree) return null;
        return { uiTree: obj.uiTree, styleSummary: typeof obj.styleSummary === "string" ? obj.styleSummary : "" } as InteractionOutput;
      },
      (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const obj = raw as Record<string, unknown>;
        if (typeof obj.uiTree === "string" && obj.uiTree) {
          return { uiTree: obj.uiTree, styleSummary: typeof obj.styleSummary === "string" ? obj.styleSummary : "" } as InteractionOutput;
        }
        return null;
      },
      stageInfo,
      "INTERACTION",
    );

    const styleModel = createStructuredModelFromState(styleOutputSchema, state.llmConfig, { temperature: 0.7 });
    const styleSystemMsg = new SystemMessage(
      `${interfaceStylingAgentInstructions}\n\n- The UI tree provided:\n${output.uiTree || "None"}\n\n- The style summary provided:\n${output.styleSummary || "None"}`,
    );

    let styleOutput: StyleOutput;
    try {
      styleOutput = await invokeWithRetry<StyleOutput>(
        styleModel,
        [styleSystemMsg, new HumanMessage("Design the interface style for the interaction result.")],
        (raw) => {
          if (!raw || typeof raw !== "object") return null;
          const obj = raw as Record<string, unknown>;
          if (!Array.isArray(obj.styles)) return null;
          return { styles: obj.styles } as StyleOutput;
        },
        () => null,
        stageInfo,
        "INTERACTION_STYLE",
      );
    } catch {
      styleOutput = { styles: [] };
    }

    return {
      interactionOutput: output,
      styleOutput,
      stageInfo,
    };
  } catch (error) {
    return {
      error: `Interaction agent failed: ${error instanceof Error ? error.message : "unknown error"}`,
      stageInfo,
    };
  }
}

// ======================== Style Edit Node ========================
const styleEditOutputSchema = z.object({
  styleEdits: z.array(z.object({
    nodeId: z.string(),
    action: z.enum(["replace-class", "add-class", "remove-class"]),
    className: z.string().optional(),
  })),
});

export async function styleEditNode(state: ChatGraphStateType): Promise<Partial<ChatGraphStateType>> {
  const stageInfo: StageInfoEntry[] = [
    { stage: "STYLE_EDIT", message: "Applying style edits...", timestamp: Date.now() },
  ];

  const model = createStructuredModelFromState(styleEditOutputSchema, state.llmConfig, { temperature: 0.3 });
  const payload = state.styleEditPayload;

  if (!payload) {
    return { error: "Style edit payload is missing", stageInfo };
  }

  const systemMsg = new SystemMessage(
    `You are a style editing agent. Your task is to make targeted style modifications to specific nodes in the UI tree.

- Current UI tree structure:
${payload.uiTreeSummary || "None"}

- Current styles:
${payload.currentStyles || "None"}

- User's edit request:
${payload.editRequest || "None"}

Rules:
- Only modify styles for nodes that are relevant to the user's request
- Use valid Tailwind CSS utility classes
- For "replace-class", provide the complete new className
- For "add-class", provide only the additional classes to append
- For "remove-class", provide the classes to remove
- Keep changes minimal and focused`,
  );

  try {
    const output = await invokeWithRetry<import("./state").StyleEditOutput>(
      model,
      [systemMsg, new HumanMessage(`Apply the following style edit: ${payload.editRequest}`)],
      (raw) => {
        if (!raw || typeof raw !== "object") return null;
        const obj = raw as Record<string, unknown>;
        if (!Array.isArray(obj.styleEdits)) return null;
        return { styleEdits: obj.styleEdits } as import("./state").StyleEditOutput;
      },
      () => null,
      stageInfo,
      "STYLE_EDIT",
    );

    return {
      styleEditOutput: output,
      stageInfo,
    };
  } catch (error) {
    return {
      error: `Style edit agent failed: ${error instanceof Error ? error.message : "unknown error"}`,
      stageInfo,
    };
  }
}

// ======================== Routing Functions ========================
export function routeAfterAdmin(state: ChatGraphStateType): string {
  if (state.error) return "end_with_error";
  if (!state.adminOutput?.necessary) return "end_text_only";
  if (state.normalizedUiNeeds.length === 0) return "end_text_only";
  return "structure";
}

export function routeAfterAlignment(state: ChatGraphStateType): string {
  if (state.error) return "end_with_error";
  if (!state.alignmentOutput) return "structure";
  if (state.alignmentOutput.verdict === "pass") return "style";
  if (state.structureAttempt >= 10) return "end_alignment_failed";
  return "structure";
}
