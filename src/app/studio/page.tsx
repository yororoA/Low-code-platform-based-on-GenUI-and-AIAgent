"use client"

import { useChat } from "@ai-sdk/react"
import { Card4u } from "@/components/card/card4u"
import { Button4u } from "@/components/button/button4u"
import { Field4u } from "@/components/field/field4u"
import { Table4u } from "@/components/table/table4u"
import { Separator4u } from "@/components/separator/separator4u"
import { AdminAgentMessage } from "../api/chat/model"

export default function StudioPage() {
  const { messages, input, handleInputChange, handleSubmit, status, stop } =
    useChat<AdminAgentMessage>();

  const lastMessage = messages.at(-1)
  const lastMessageText =
    lastMessage?.parts
      ?.map(part => {
        if (part.type === "text") {
          return part.text
        }
        return ""
      })
      .join("")
      .trim() ?? ""

  const tableRows = messages.map(message => ({
    key: message.id,
    cells: [
      { content: message.role },
      {
        content:
          message.parts
            ?.map(part => (part.type === "text" ? part.text : ""))
            .join("")
            .trim() || "(non-text message)",
      },
    ],
  }))

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card4u
          title="Prompt Console"
          description="输入需求并实时接收 Agent 流式输出。"
          showDefaultFooterButton={false}
          content={
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Field4u
                legend="Input"
                items={[
                  {
                    id: "prompt-input",
                    label: "User Prompt",
                    description: "支持自然语言描述页面需求",
                    control: (
                      <textarea
                        id="prompt-input"
                        name="prompt"
                        value={input}
                        onChange={handleInputChange}
                        placeholder="例如：生成一个电商后台仪表盘，包含图表、筛选和表格"
                        className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    ),
                  },
                ]}
              />

              <div className="flex flex-wrap gap-2">
                <Button4u
                  label={status === "streaming" ? "Generating..." : "Send"}
                  buttonProps={{
                    type: "submit",
                    disabled: status === "submitted" || status === "streaming",
                  }}
                />
                <Button4u
                  label="Stop"
                  buttonProps={{
                    type: "button",
                    variant: "outline",
                    onClick: stop,
                    disabled: status !== "streaming",
                  }}
                />
              </div>
            </form>
          }
        />

        <Card4u
          title="Latest Output"
          description="最后一条消息提取（messages.at(-1)）"
          showDefaultFooterButton={false}
          content={
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-1">role</div>
                <div>{lastMessage?.role ?? "-"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-1">text</div>
                <div className="whitespace-pre-wrap break-words">
                  {lastMessageText || "暂无文本输出"}
                </div>
              </div>
            </div>
          }
        />
      </div>

      <Separator4u label="Conversation" />

      <Card4u
        title="Message Timeline"
        description="会话消息基础表格视图"
        showDefaultFooterButton={false}
        content={
          <Table4u
            captionTitle={`Total messages: ${messages.length}`}
            headers={[
              { description: "Role", className: "w-36" },
              { description: "Content" },
            ]}
            rows={tableRows}
          />
        }
      />
    </div>
  )
}