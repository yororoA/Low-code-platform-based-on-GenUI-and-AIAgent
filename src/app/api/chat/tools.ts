import { tool } from "ai";
import { z } from "zod";
import {structureAgent} from "./model"


// tool for admin to call structure agent
export const callStructureAgent = tool({
  description: "Calls the structure agent to design the interface structure and component layout.",
  inputSchema: z.object({
    textDescription: z.string()
      .describe("The text description based on which the structure agent will design the interface."),
    uiNeeds: z.array(z.string())
      .describe("A list of UI components that are needed, which can guide the structure agent's design."),
  }),
  execute: async ({ textDescription, uiNeeds }) => {
    const response = await structureAgent.generate({
      prompt: textDescription,
      options: {
        uiProvided: uiNeeds,
      }
    });

    return `Structure agent response: ${JSON.stringify(response.output ?? response.text ?? "")}`;
  },
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


