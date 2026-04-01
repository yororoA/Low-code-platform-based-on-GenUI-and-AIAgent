import { AdminAgentMessage } from "@/app/api/chat/model";
import { dedupeMessages } from "@/lib/utils";


onmessage = (event: MessageEvent<AdminAgentMessage[]>) => {
  const messages = event.data as AdminAgentMessage[];
  const dedupedMessages = dedupeMessages(messages);
  postMessage(dedupedMessages);
}