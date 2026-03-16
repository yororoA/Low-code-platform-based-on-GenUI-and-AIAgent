import { UIMessage, createAgentUIStreamResponse } from "ai"

import { agents } from "./model"

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  return createAgentUIStreamResponse({
    agent: agents,
    uiMessages: messages,
    options: {
      agentLevel: "admin",
    },
  })
}
