import { AdminAgentMessage } from "@/app/api/chat/model"


function getMessageSignature(message: AdminAgentMessage): string {
  if (message.role === "assistant") {
    return JSON.stringify({
      role: message.role,
      parts: message.parts,
    })
  }
  return JSON.stringify({
    id: message.id,
    role: message.role,
    parts: message.parts,
  })
}

export function dedupeMessages(list: AdminAgentMessage[]): AdminAgentMessage[] {
  const seen = new Set<string>()
  const result: AdminAgentMessage[] = []
  for (const message of list) {
    const signature = getMessageSignature(message)
    if (seen.has(signature)) continue
    seen.add(signature)
    result.push(message)
  }
  return result
}