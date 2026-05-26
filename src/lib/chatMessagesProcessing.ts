import type { AgentMessage } from "@/types"


function getMessageSignature(message: AgentMessage): string {
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

export function dedupeMessages(list: AgentMessage[]): AgentMessage[] {
  const seen = new Set<string>()
  const result: AgentMessage[] = []
  for (const message of list) {
    const signature = getMessageSignature(message)
    if (seen.has(signature)) continue
    seen.add(signature)
    result.push(message)
  }
  return result
}