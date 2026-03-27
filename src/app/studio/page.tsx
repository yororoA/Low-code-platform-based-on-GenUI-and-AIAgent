"use client"

import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AdminAgentMessage } from "../api/chat/model"
import { DBOperation } from "@/lib/dbtest";

export default function StudioPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat<AdminAgentMessage>();

  useEffect(()=>{
    // 连接数据库
    DBOperation('open');

    // 每次 messages 更新时将最新消息存储到 IndexedDB
    

    // 组件卸载时关闭数据库连接
    return () => {
      DBOperation('close');
    };
  }, [messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    await sendMessage({ text })
    setInput("")
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  };

  const lastMessage = messages.at(-1);
  const lastMessageText =
    lastMessage?.parts
      ?.map(part => {
        if (part.type === "text") {
          return part.text
        }
        return ""
      })
      .join("")
      .trim() ?? "";

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
  }));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Prompt Console</CardTitle>
            <CardDescription>输入需求并实时接收 Agent 流式输出。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="prompt-input">User Prompt</Label>
                <p className="text-xs text-muted-foreground">支持自然语言描述页面需求</p>
                <textarea
                  id="prompt-input"
                  name="prompt"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="例如：生成一个电商后台仪表盘，包含图表、筛选和表格"
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={status === "submitted" || status === "streaming"}
                >
                  {status === "streaming" ? "Generating..." : "Send"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stop}
                  disabled={status !== "streaming"}
                >
                  Stop
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Output</CardTitle>
            <CardDescription>最后一条消息提取（messages.at(-1)）</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">Conversation</span>
        <Separator className="flex-1" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message Timeline</CardTitle>
          <CardDescription>会话消息基础表格视图</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>{`Total messages: ${messages.length}`}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Role</TableHead>
                <TableHead>Content</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="align-top">{row.cells[0].content}</TableCell>
                  <TableCell className="whitespace-pre-wrap break-words align-top">
                    {row.cells[1].content}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}