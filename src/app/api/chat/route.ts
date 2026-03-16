import { convertToModelMessages, UIMessage } from "ai"
import { agents } from "./model"
import { callStructureAgent } from "./tools"

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  const modelMessages = await convertToModelMessages(messages, { tools: agents.tools })

  // level 1 agent to test user input and decide whether to use UI.
  const levelONEresp = await agents.stream({
    messages: modelMessages,
    options: {
      agentLevel: "admin",
    },
  })

  return levelONEresp.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: uiMessages, responseMessage, isAborted, finishReason }) => {
      if (isAborted) {
        return
      }
      // 取出agent的输出，判断是否需要UI
      const agentOutput = uiMessages[uiMessages.length - 1];
      if (agentOutput?.necessary && agentOutput.uiNeeds.length > 0) {
        // 如果需要UI，则调用structure agent进行设计
        const structureResp = await agents.generate({
          prompt: `
            - It is determined that the boss needs a UI for better understanding.
            - The following is the text response and the list of needed UI components that the boss requires:
              - text: ${agentOutput.text}
              - uiNeeds: ${agentOutput.uiNeeds.join(", ")}
            - Based on this information, please call the structure agent to design the structure of the UI and the layout of the components.
          `,
        options: {                       
          agentLevel: "admin",
        }
        });
      }

      // Stream is fully generated at this point. Place persistence/logging/analytics here.
      console.log("agent stream finished", {
        finishReason,
        responseMessageId: responseMessage.id,
        totalMessages: uiMessages.length,
      })
    },
  })
}
