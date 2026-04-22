import { callInteractionAgent, callStyleAgent } from "../tools"
import type { InteractionRequestPayload, InteractionResponsePayload } from "@/types/interaction"
import { componentsMetaByName } from "@/components/components-meta"

export async function POST(req: Request) {
  const body: InteractionRequestPayload = await req.json()

  const supportedComponentNames = Object.keys(componentsMetaByName)

  const interactionOutput = await callInteractionAgent({
    interactionType: body.type,
    interactionDescription: body.contentDescription ?? body.description ?? body.onSubmitDescription ?? "",
    currentPageContext: body.currentPageContext,
    uiProvided: supportedComponentNames,
  })

  if (!interactionOutput?.uiTree) {
    return Response.json(
      { error: "Interaction agent failed to generate UI tree" },
      { status: 500 },
    )
  }

  const currentUiTree = typeof interactionOutput.uiTree === "string"
    ? interactionOutput.uiTree
    : JSON.stringify(interactionOutput.uiTree)

  const styleResp = await callStyleAgent(
    currentUiTree,
    interactionOutput.styleSummary ?? "",
  )

  let styles: InteractionResponsePayload["styles"] = []
  try {
    const styleOutput = await styleResp.resp.output
    styles = styleOutput.styles
  } catch {
    styles = []
  }

  const response: InteractionResponsePayload = {
    uiTree: currentUiTree,
    styles,
    interactions: interactionOutput.interactions,
    pages: interactionOutput.pages,
  }

  return Response.json(response)
}
