import { callStyleEditAgent } from "../tools"

export async function POST(req: Request) {
  const body = await req.json() as {
    uiTreeSummary: string
    currentStyles: string
    editRequest: string
  }

  const editOutput = await callStyleEditAgent({
    uiTreeSummary: body.uiTreeSummary,
    currentStyles: body.currentStyles,
    editRequest: body.editRequest,
  })

  if (!editOutput?.styleEdits) {
    return Response.json(
      { error: "Style edit agent failed to produce edits" },
      { status: 500 },
    )
  }

  return Response.json({ styleEdits: editOutput.styleEdits })
}
