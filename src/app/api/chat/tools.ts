import { tool } from "ai";
import { z } from "zod";

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


