import type { AgentMessage } from "@/types";

export function getShowResponsePayload(message: AgentMessage) {
  return message.parts
    .find((part) => part.type === "show-response")
    ?.data;
}
