import { AdminAgentMessage } from "@/app/api/chat/model";

export function getShowResponsePayload(message: AdminAgentMessage) {
  return message.parts
    .find((part) => part.type === "tool-showResponse")
    ?.input;
}