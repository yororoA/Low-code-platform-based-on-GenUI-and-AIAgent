import { convertToModelMessages, UIMessage, createUIMessageStreamResponse, createUIMessageStream } from "ai"
import { adminAgent } from "./model"
import { callStructureAgent_Stream, callStyleAgent } from "./tools";


export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages, {
    ignoreIncompleteToolCalls: true, // to avoid errors when tool calls are incomplete
  });

  // multi agents response sse
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        // level 1 agent to test user input and decide whether to use UI.
        const levelONEresp = await adminAgent.stream({
          messages: modelMessages,
        });
        // level one merge to stream
        await writer.merge(levelONEresp.toUIMessageStream());

        const levelONEoutput = await levelONEresp.output;
        // level 2 agent to design UI if necessary
        if(levelONEoutput.necessary && levelONEoutput.uiNeeds.length > 0) {
          const structureResp = await callStructureAgent_Stream({
            textDescription: levelONEoutput.uiDescription,
            uiNeeds: levelONEoutput.uiNeeds
          });
          // level 2 merge to stream
          await writer.merge(structureResp.stream());

          const levelTWOoutput = await structureResp.resp.output;
          // level 3 for style design
          const styleResp = await callStyleAgent(levelTWOoutput.uiTree);
          // level 3 merge to stream
          await writer.merge(styleResp.stream());

          const styles = (await styleResp.resp.output).styles;
          // TODO: persist/apply generated styles to storage or downstream renderer.
          console.log("generated styles", styles);
        }


      }
    })
  })














  // return levelONEresp.toUIMessageStreamResponse({
  //   originalMessages: messages,
  //   onFinish: async ({ messages: uiMessages, responseMessage, isAborted, finishReason }) => {
  //     if (isAborted) {
  //       return
  //     }
  //     // 取出agent的输出，判断是否需要UI
  //     // const agentOutput = uiMessages[uiMessages.length - 1];
  //     // if (agentOutput?.necessary && agentOutput.uiNeeds.length > 0) {
  //     //   // 如果需要UI，则调用structure agent进行设计
  //     //   const structureResp = await structureAgent.generate({
  //     //     prompt: `
  //     //       - It is determined that the boss needs a UI for better understanding.
  //     //       - The following is the text response and the list of needed UI components that the boss requires:
  //     //         - text: ${agentOutput.text}
  //     //         - uiNeeds: ${agentOutput.uiNeeds.join(", ")}
  //     //       - Based on this information, please call the structure agent to design the structure of the UI and the layout of the components.
  //     //     `,
  //     //   options: {                       
  //     //     agentLevel: "admin",
  //     //   }
  //     //   });
  //     // }

  //     // Stream is fully generated at this point. Place persistence/logging/analytics here.
  //     console.log("agent stream finished", {
  //       finishReason,
  //       responseMessageId: responseMessage.id,
  //       totalMessages: uiMessages.length,
  //     })
  //   },
  // });
}
