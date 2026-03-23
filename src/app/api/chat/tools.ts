import { tool } from "ai";
import { z } from "zod";
import { alignmentAgent, structureAgent, styleAgent } from "./model"


// ======================= tool for call structure agent ======================
// desc of the tool
const struDesc = {
  description: "Calls the structure agent to design the interface structure and component layout.",
  inputSchema: z.object({
    textDescription: z.string()
      .describe("The text description based on which the structure agent will design the interface."),
    uiNeeds: z.array(z.string())
      .describe("A list of UI components that are needed, which can guide the structure agent's design."),
  }),
};


// just generate
export const callStructureAgent_Usual = tool({
  ...struDesc,
  execute: async ({ textDescription, uiNeeds }, { abortSignal }) => {
    // abortSignal used for cancellation while user canceled the request
    const response = await structureAgent.generate({
      prompt: textDescription,
      abortSignal,
      options: {
        uiProvided: uiNeeds,
      }
    });

    // with a output schema might be 'resp.output'
    return `Structure agent response: ${JSON.stringify(response.output ?? response.text ?? "")}`;
  },
});


// with stream
export async function callStructureAgent_Stream(params: z.infer<typeof struDesc.inputSchema>) {
  const resp = await structureAgent.stream({
    prompt: params.textDescription,
    options: {
      uiProvided: params.uiNeeds,
    }
  });

  return {
    resp,
    stream: () => resp.toUIMessageStream(),
  }
}
/* tool({
  ...struDesc,
  execute: async function* ({ textDescription, uiNeeds }, { abortSignal }) {
    // abortSignal used for cancellation while user canceled the request
    const resp = await structureAgent.stream({
      prompt: textDescription,
      abortSignal,
      options: {
        uiProvided: uiNeeds,
      }
    });

    for await (const chunk of readUIMessageStream({
      stream: resp.toUIMessageStream(),
    })) yield chunk;
  },
  toModelOutput: ({output: chunk}) => {
    const lastTextPart = chunk?.parts.findLast((part) => part.type === "text");
    return {
      type: 'text',
      value: lastTextPart?.text ?? "Task completed",  // null or completed
    }
  },
}); */
// =====================================================================================


// =========================== tool used for call style agent ==================
// Calls the style agent to design the interface style based on the provided UI tree.
export async function callStyleAgent(uiTree: string, styleSummary: string) {
  const resp = await styleAgent.stream({
    prompt: 'Design the interface style based on the provided UI tree.',
    options: {
      uiTree,
      styleSummary,
    }
  });

  return {
    resp,
    stream: () => resp.toUIMessageStream(),
  };
}
// ======================================================================


// =========================== tool used for alignment critic ==================
export async function callAlignmentAgent(params: {
  uiDescription: string
  uiNeeds: string[]
  uiTree: string
}) {
  const response = await alignmentAgent.generate({
    prompt: "Check the alignment between uiDescription and uiTree.",
    options: {
      uiDescription: params.uiDescription,
      uiNeeds: params.uiNeeds,
      uiTree: params.uiTree,
    }
  })

  return response.output
}
// ======================================================================

export const chatTools = {
  print: tool({
    description: "Prints a message to the console.",
    inputSchema: z.object({
      message: z.string(),
    }),
    execute: async ({ message }) => {
      return "print-tool called: " + message;
    },
  }),
  randomNumber: tool({
    description: "Generates a random number between 0 and 1.",
    inputSchema: z.object({}),
    execute: async () => {
      return "randomNumber-tool called: " + Math.random();
    },
  }),
};


