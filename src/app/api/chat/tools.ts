import { readUIMessageStream, tool } from "ai";
import { z } from "zod";
import { structureAgent, styleAgent } from "./model"


// ======================= tool for admin to call structure agent ======================
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
export const callStructureAgent_Stream = tool({
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
});
// =====================================================================================


// =========================== tool used for call style agent ==================
// desc of the tool
const styDesc = {
  description: "Calls the style agent to design the interface style based on the provided UI tree.",
  inputSchema: z.object({
    uiTree: z.string().describe("The UI tree provided, which can guide the style agent's design."),
  }),
}

export const callStyleAgent = tool({
  ...styDesc,
  execute: async ({ uiTree }, { abortSignal }) => {
    const resp = await styleAgent.generate({
      prompt: "",
      abortSignal,
      options:{
        uiTree,
      }
    });

    return `Style agent response: ${JSON.stringify(resp.output ?? resp.text ?? "")}`;
  }
});

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


