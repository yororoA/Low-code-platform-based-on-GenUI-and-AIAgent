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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { AlertCircle } from "lucide-react"
import { AdminAgentMessage } from "../api/chat/model"
import { DBManager } from "@/lib/dbtest"
import { getShowResponsePayload, strToHexStr, dispatchEvent } from "@/lib/utils"
import { useSearchParams } from "next/navigation"
import { DataItem, DataItemSummary } from "@/types"

const STAGE_INFO_RE = /^\[(ADMIN|STRUCTURE|ALIGNMENT|STYLE)\]:\s*(.+)$/i

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

type DisplayInfo =
  | { type: "stage"; stage: string; text: string; details: string[] }
  | { type: "tool"; text: string }
  | { type: "text"; text: string }

type StagePreviewPayload = {
  topic: string
  structureText: string
  styleText: string
}

export default function BasicUI() {
  const [input, setInput] = useState<string>("")
  const thisDetailRef = useRef<{ id: string; topic: string; timestamp: Date }>({
    id: "",
    topic: "New Conversation",
    timestamp: new Date(),
  })
  const [topic, setTopic] = useState<string>("New Conversation")
  const { messages, setMessages, sendMessage, status, stop, error } =
    useChat<AdminAgentMessage>()
    
  const normalizedMessages = useMemo(() => dedupeMessages(messages), [messages])

  // 初始化获取历史数据
  const searchParams = useSearchParams()
  useEffect(() => {
    ;(async () => {
      const id = searchParams.get("id")
      if (id) {
        const history = (await DBManager.execute({
          operationType: "get",
          id: id,
        })) as DataItem
        if (history) {
          setMessages(dedupeMessages(history.messages))
          thisDetailRef.current = {
            id: history.id,
            topic: history.topic,
            timestamp: history.timestamp,
          }
          setTopic(history.topic)
        }
      }
    })()
  }, [setMessages, searchParams])

  // 更新逻辑：采用防抖策略 (Debounce) 避免高频操作
  useEffect(() => {
    if (normalizedMessages.length === 0) return

    // 设置 800ms 防抖，流式输出时（极度高频修改）不会立刻执行，流出停顿时才会集中执行一次
    const updateTimer = setTimeout(async () => {
      const d = thisDetailRef.current

      // 尝试从最新的 assistant 消息中提取 topic
      let extractedTopic = ""
      const assistantMessages = normalizedMessages.filter(
        (m) => m.role === "assistant"
      )
      for (let i = assistantMessages.length - 1; i >= 0; i--) {
        const payload = getShowResponsePayload(assistantMessages[i])
        if (payload?.topic) {
          extractedTopic = payload.topic
          break // 取到最新的直接退出循环
        }
      }

      const isNew = !d.id

      if (isNew) {
        // 初始化 ID
        d.topic = extractedTopic || "New Conversation"
        d.id = strToHexStr(d.topic + Date.now().toString())
        d.timestamp = new Date()
      } else if (extractedTopic) {
        // 更新 topic
        d.topic = extractedTopic
      }

      // 安全 setState: 只有在值真实改变时才会触发视图重新渲染
      setTopic((prevTopic) => {
        if (prevTopic !== d.topic) {
          return d.topic
        }
        return prevTopic
      })

      if (d.id) {
        try {
          await DBManager.execute({
            operationType: "update",
            data: {
              ...d,
              messages: normalizedMessages,
            },
          })
          if (isNew) {
            dispatchEvent<DataItemSummary>("newConversation", d)
          } else {
            dispatchEvent<DataItemSummary>("updateConversation", d)
          }
        } catch (error) {
          console.error("DB Update Error: ", error)
        }
      }
    }, 800) 

    // 清理函数：如果下一次 token 渲染极快地进来，就清除刚才预定的操作
    return () => clearTimeout(updateTimer)
  }, [normalizedMessages])

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

  const getAssistantInfos = (message: AdminAgentMessage): DisplayInfo[] => {
    const infos: DisplayInfo[] = []
    if (message.role !== "assistant" || !message.parts) return infos

    const seenStage = new Set<string>()
    const stageIndexByKey = new Map<string, number>()
    let activeStageIndex: number | null = null

    for (const part of message.parts) {
      if (part.type === "tool-showResponse") {
        const toolText = (part as unknown as { input?: { text?: string } }).input?.text
        if (toolText) {
          infos.push({ type: "tool", text: toolText })
        }
        activeStageIndex = null
      } else if (part.type === "text") {
        const lines = part.text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)

        for (const line of lines) {
          const matched = line.match(STAGE_INFO_RE)
          if (matched) {
            const stage = matched[1].toUpperCase()
            const text = matched[2]
            const key = `${stage}|${text}`

            if (seenStage.has(key)) {
              activeStageIndex = stageIndexByKey.get(key) ?? null
              continue
            }

            const nextInfo: DisplayInfo = { type: "stage", stage, text, details: [] }
            const nextInfoIndex = infos.length
            infos.push(nextInfo)
            stageIndexByKey.set(key, nextInfoIndex)
            activeStageIndex = nextInfoIndex
            if (!seenStage.has(key)) {
              seenStage.add(key)
            }
          } else {
            if (activeStageIndex != null && infos[activeStageIndex]?.type === "stage") {
              const stageInfo = infos[activeStageIndex]
              if (stageInfo.type === "stage") {
                stageInfo.details.push(line)
              }
            } else {
              infos.push({ type: "text", text: line })
            }
          }
        }
      }
    }

    if (infos.length === 0) {
      infos.push({ type: "text", text: "(non-text message)" })
    }

    return infos
  }

  const getDisplayText = (message: AdminAgentMessage): DisplayInfo[] => {
    if (message.role === "user") {
      const text = getMessageText(message) || "(empty user message)"
      return [{ type: "text", text }]
    }
    return getAssistantInfos(message)
  }

  const getPreviewPayload = (
    message: AdminAgentMessage,
    displayInfos: DisplayInfo[],
  ): StagePreviewPayload | null => {
    if (message.role !== "assistant") return null
    const payload = getShowResponsePayload(message) as { topic?: string } | undefined
    const topic = payload?.topic?.trim()
    if (!topic) return null

    const lastStructure = [...displayInfos].reverse().find(
      (info): info is Extract<DisplayInfo, { type: "stage" }> =>
        info.type === "stage" && info.stage === "STRUCTURE",
    )
    const lastStyle = [...displayInfos].reverse().find(
      (info): info is Extract<DisplayInfo, { type: "stage" }> =>
        info.type === "stage" && info.stage === "STYLE",
    )
    const structureText = lastStructure?.details.join("\n").trim() ?? ""
    const styleText = lastStyle?.details.join("\n").trim() ?? ""
    if (!structureText || !styleText) return null
    return { topic, structureText, styleText }
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
                const displayInfos = getDisplayText(message)
                const previewPayload = getPreviewPayload(message, displayInfos)

                return (
                  <div
                    key={`${message.id}-${index}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%] space-y-2">
                      {displayInfos.map((info, idx) => {
                        if (info.type === "stage") {
                          return (
                            <Accordion
                              key={`${message.id}-info-${idx}`}
                              type="single"
                              collapsible
                              className="rounded-md border bg-amber-50 px-3 text-xs text-amber-900"
                            >
                              <AccordionItem value={`${message.id}-stage-${idx}`} className="border-b-0">
                                <AccordionTrigger className="py-2 text-xs text-amber-900 hover:no-underline">
                                  <span className="text-left">
                                    <span className="font-semibold">[{info.stage}]</span>{" "}
                                    {info.text}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent className="pt-1 pb-2">
                                  {info.details.length > 0 ? (
                                    <div className="whitespace-pre-wrap break-words text-xs text-amber-950/90">
                                      {info.details.join("\n")}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-amber-800/80">(no detail)</div>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )
                        }

                        if (info.text) {
                          return (
                            <div
                              key={`${message.id}-info-${idx}`}
                              className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                                isUser
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card border text-card-foreground"
                              }`}
                            >
                              {info.text}
                            </div>
                          )
                        }

                        return null
                      })}
                      {!isUser && previewPayload ? (
                        <Card
                          className="cursor-pointer border-primary/30 bg-primary/5 transition-colors hover:bg-primary/10"
                          onClick={() => {
                            dispatchEvent<StagePreviewPayload>("studioPreviewOpen", previewPayload)
                          }}
                        >
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">{previewPayload.topic}</CardTitle>
                            <CardDescription>点击查看本轮结构/样式渲染预览</CardDescription>
                          </CardHeader>
                        </Card>
                      ) : null}
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