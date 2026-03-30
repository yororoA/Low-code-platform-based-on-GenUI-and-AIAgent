"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"
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
import { DBManager } from "@/lib/dbtest"
import { getShowResponsePayload, strToHexStr } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { DataItem, DataItemSummary } from "@/types"

const STAGE_INFO_RE = /^\[(ADMIN|STRUCTURE|ALIGNMENT|STYLE)\]:\s*(.+)$/i

function getMessageSignature(message: AdminAgentMessage): string {
  // assistant 消息按内容去重（避免同一阶段提示被不同 id 重复记录）
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

function dedupeMessages(list: AdminAgentMessage[]): AdminAgentMessage[] {
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


export default function BasicUI() {
  const [input, setInput] = useState<string>("")
  const thisDetailRef = useRef<{ id: string, topic: string, timestamp: Date }>({
    id: '', topic: 'New Conversation', timestamp: new Date()
  });
  const [topic, setTopic] = useState<string>('New Conversation');
  const { messages, setMessages, sendMessage, status, stop, error } = useChat<AdminAgentMessage>();
  const normalizedMessages = useMemo(() => dedupeMessages(messages), [messages])

  useEffect(() => {
    if (normalizedMessages.length !== messages.length) {
      setMessages(normalizedMessages)
    }
  }, [messages.length, normalizedMessages, setMessages])

  // 初始
  const searchParams = useSearchParams();
  useEffect(() => {
    // 从库中读取历史记录
    (async () => {
      const id = searchParams.get('id');
      if (id) {
        const history = await DBManager.execute({
          operationType: 'get',
          id: id
        }) as DataItem;
        if (history) {
          setMessages(dedupeMessages(history.messages))
          thisDetailRef.current = {
            id: history.id,
            topic: history.topic,
            timestamp: history.timestamp
          };
          setTopic(history.topic);
        }
      }
    })()
  }, [setMessages, searchParams]);

  // 更新
  useEffect(() => {
    if (normalizedMessages.length === 0) return;

    const saveToDB = async () => {
      const d = thisDetailRef.current;

      // 尝试从最新的 assistant 消息中提取 topic
      let extractedTopic = "";
      const assistantMessages = normalizedMessages.filter(m => m.role === 'assistant');
      for (let i = assistantMessages.length - 1; i >= 0; i--) {
        const payload = getShowResponsePayload(assistantMessages[i]);
        if (payload?.topic) {
          extractedTopic = payload.topic;
          setTopic(extractedTopic);
          break;
        }
      }

      const isNew = !d.id;

      if (isNew) {
        // 初始化 ID
        d.topic = extractedTopic || 'New Conversation';
        d.id = strToHexStr(d.topic + Date.now().toString());
        d.timestamp = new Date();
      } else if (extractedTopic) {
        // 更新 topic
        d.topic = extractedTopic;
      }

      if (d.id) {
        try {
          await DBManager.execute({
            operationType: 'update',
            data: {
              ...d,
              messages: normalizedMessages
            }
          });
          if (isNew) {
            window.dispatchEvent(
              new CustomEvent<DataItemSummary>('newConversation', {
                detail: {
                  id: d.id,
                  topic: d.topic,
                  timestamp: d.timestamp
                }
              })
            );
          }else{
            window.dispatchEvent(
              new CustomEvent<DataItemSummary>('updateConversation', {
                detail: {
                  id: d.id,
                  topic: d.topic,
                  timestamp: d.timestamp
                }
              })
            );
          }
        } catch (error) {
          console.error(error);
        }
      }
    };

    saveToDB();
  }, [normalizedMessages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    setInput("")
    await sendMessage({ text })
  }

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }

  const isStreaming = status === "streaming" || status === "submitted"
  const canSend = input.trim().length > 0 && !isStreaming

  const getMessageText = (message: AdminAgentMessage) =>
    message.parts
      ?.map((part) => (part.type === "text" ? part.text : ""))
      .join("\n")
      .trim()

  const getStageInfos = (message: AdminAgentMessage) => {
    if (message.role !== "assistant") return []
    const all = message.parts
      .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
      .flatMap((part) =>
        part.text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .flatMap((line) => {
            const matched = line.match(STAGE_INFO_RE)
            if (!matched) return []
            return [{ stage: matched[1].toUpperCase(), text: matched[2] }]
          })
      )

    // 去重：同一条 assistant 消息里，重复的 stageInfo 只显示一次
    const seen = new Set<string>()
    return all.filter((item) => {
      const key = `${item.stage}|${item.text}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const stripStageInfoFromText = (text: string) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !STAGE_INFO_RE.test(line))
      .join("\n")
      .trim()

  const getDisplayText = (message: AdminAgentMessage) => {
    if (message.role === "user") {
      return getMessageText(message) || "(empty user message)"
    }

    const toolText = message.parts
      .find((part) => part.type === "tool-showResponse")
      ?.input?.text

    if (toolText) return toolText

    const text = getMessageText(message)
    const strippedText = stripStageInfoFromText(text)
    if (strippedText) return strippedText

    return getStageInfos(message).length > 0 ? "" : "(non-text message)"
  }

  return (
    <div className="h-full p-4 md:p-6 flex flex-col">
      <Card className="flex flex-1 flex-col min-h-0">
        <CardHeader>
          <CardTitle>{topic}</CardTitle>
          <CardDescription>输入需求并实时接收 Agent 流式输出。</CardDescription>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-3">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                还没有消息，输入内容后点击 Send 开始对话。
              </div>
            ) : (
              normalizedMessages.map((message, index) => {
                const isUser = message.role === "user"
                const stageInfos = getStageInfos(message)
                const displayText = getDisplayText(message)
                return (
                  <div
                    key={`${message.id}-${index}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%] space-y-2">
                      {!isUser && stageInfos.length > 0 && (
                        <div className="space-y-1">
                          {stageInfos.map((item, stageIndex) => (
                            <div
                              key={`${message.id}-stage-${stageIndex}`}
                              className="rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-900"
                            >
                              <span className="font-semibold">[{item.stage}]</span> {item.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {displayText && (
                        <div
                          className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border text-card-foreground"
                            }`}
                        >
                          {displayText}
                        </div>
                      )}
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