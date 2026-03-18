import { readUIMessageStream, tool } from "ai";
import { z } from "zod";
import { structureAgent } from "./model"


// ======================= tool for admin to call structure agent ======================
// desc of the tool
const desc = {
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
  ...desc,
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
  ...desc,
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
  }
});
// =====================================================================================


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


