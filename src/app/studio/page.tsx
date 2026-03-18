import { useChat } from "@ai-sdk/react";
import { AdminAgentMessage } from "../api/chat/model";
import test from "node:test";

export default function StudioPage() {
  const { messages } = useChat<AdminAgentMessage>();
  test('renders messages', () => {
    <ul>
      {messages.map(msg => (<li key={`${msg}`}>{`${msg}`}</li>))}
    </ul>
  })

  return (
    <div>
      StudioPage
    </div>
  )
}