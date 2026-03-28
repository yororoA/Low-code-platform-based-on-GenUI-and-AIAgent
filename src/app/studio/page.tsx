"use client"

import { ChangeEvent, FormEvent, useEffect, useState, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { AdminAgentMessage } from "../api/chat/model"
import { DBManager, DataItem } from "@/lib/dbtest"
import { strToHexStr } from "@/lib/utils"

const getShowResponsePayload = (message: AdminAgentMessage) => {
  return message.parts
    .find((part) => part.type === "tool-showResponse")
    ?.input;
}

export default function StudioPage() {
  const [input, setInput] = useState<string>("")
  const thisDetailRef = useRef<{ id: string, topic: string, timestamp: Date }>({
    id: '', topic: 'New Conversation', timestamp: new Date()
  });
  const { messages, setMessages, sendMessage, status, stop, error } = useChat<AdminAgentMessage>({
    onFinish: (event) => {
      const { message } = event;
      // messages更新
      if (!thisDetailRef.current.id) {
        const payload = getShowResponsePayload(message);
        if (payload?.topic) {
          thisDetailRef.current.topic = payload.topic;
          thisDetailRef.current.id = strToHexStr(thisDetailRef.current.topic + (new Date()).toString());
          thisDetailRef.current.timestamp = new Date();
        }
      }
      (async () => {
        await DBManager.execute({
          operationType: 'update',
          data: {
            ...thisDetailRef.current,
            messages: [...messages, message]
          }
        });
      })();
    },
  });

  // 初始
  useEffect(() => {
    // 从库中读取历史记录
    (async () => {
      const history = await DBManager.execute({
        operationType: "getAllByIndex",
        indexName: "timestampIndex",
      }) as DataItem[]
      const last = history.at(-1)
      if (last) {
        setMessages(last.messages)
        thisDetailRef.current = {
          id: last.id,
          topic: last.topic,
          timestamp: last.timestamp
        };
      }
    })()
  }, [setMessages])

  // 更新
  useEffect(() => {
    if (messages.length === 0) return;

    const saveToDB = async () => {
      const d = thisDetailRef.current;

      // 尝试从最新的 assistant 消息中提取 topic
      let extractedTopic = "";
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      for (let i = assistantMessages.length - 1; i >= 0; i--) {
        const payload = getShowResponsePayload(assistantMessages[i]);
        if (payload?.topic) {
          extractedTopic = payload.topic;
          break;
        }
      }

      if (!d.id) {
        // 初始化 ID
        d.topic = extractedTopic || 'New Conversation';
        d.id = strToHexStr(d.topic + Date.now().toString());
        d.timestamp = new Date();
      } else if (extractedTopic && d.topic === 'New Conversation') {
        // 更新 topic
        d.topic = extractedTopic;
      }

      if (d.id) {
        await DBManager.execute({
          operationType: 'update',
          data: {
            ...d,
            messages
          }
        });
      }
    };

    saveToDB();
  }, [messages])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    await sendMessage({ text })
    setInput("")
  }

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }

  const isStreaming = status === "streaming" || status === "submitted"
  const canSend = input.trim().length > 0 && !isStreaming

  const getMessageText = (message: AdminAgentMessage) =>
    message.parts
      ?.map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim()

  const getDisplayText = (message: AdminAgentMessage) => {
    if (message.role === "user") {
      return getMessageText(message) || "(empty user message)"
    }

    const toolText = message.parts
      .find((part) => part.type === "tool-showResponse")
      ?.input?.text

    return toolText || getMessageText(message) || "(non-text message)"
  }

  return (
    <div className="h-full p-4 md:p-6 flex flex-col">
      <Card className="flex flex-1 flex-col min-h-0">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>输入需求并实时接收 Agent 流式输出。</CardDescription>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-3">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                还没有消息，输入内容后点击 Send 开始对话。
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === "user"
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border text-card-foreground"
                        }`}
                    >
                      {getDisplayText(message)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>错误</AlertTitle>
              <AlertDescription>
                {error.message || "发生了一个未知错误，请重试。"}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-auto flex items-end gap-2">
            <textarea
              id="prompt-input"
              name="prompt"
              value={input}
              onChange={handleInputChange}
              placeholder="例如：生成一个电商后台仪表盘，包含图表、筛选和表格"
              className="min-h-24 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />

            {isStreaming ? (
              <Button type="button" variant="outline" onClick={stop}>
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={!canSend}>
                Send
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}