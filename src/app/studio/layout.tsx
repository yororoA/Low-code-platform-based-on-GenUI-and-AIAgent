'use client'
import { useEffect, type ReactNode, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui"
import { DBManager } from "@/lib/dbtest"
import { cn } from "@/lib/utils"
import { DataItemSummary } from "@/types"
import { ChatDetailsContext } from "@/contexts";
import { isUiTreeNode, renderNode, type UiTreeNode } from "@/lib/renderByAST";
import { useChatStreamingStore } from "@/store/chatStreamingStore";
import { useShallow } from "zustand/shallow"


type StudioPreviewPayload = {
  topic: string
  structureText: string
  styleText: string
}

function extractJsonObjectByKey(raw: string, key: string): Record<string, unknown> | null {
  if (!raw) return null
  const keyMark = `"${key}"`
  for (let start = 0; start < raw.length; start++) {
    if (raw[start] !== "{") continue
    let depth = 0
    let inString = false
    let escaped = false
    for (let end = start; end < raw.length; end++) {
      const ch = raw[end]
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (ch === "\\") {
          escaped = true
        } else if (ch === "\"") {
          inString = false
        }
        continue
      }
      if (ch === "\"") {
        inString = true
        continue
      }
      if (ch === "{") depth++
      if (ch === "}") {
        depth--
        if (depth === 0) {
          const candidate = raw.slice(start, end + 1)
          if (!candidate.includes(keyMark)) break
          try {
            const parsed = JSON.parse(candidate) as Record<string, unknown>
            if (Object.prototype.hasOwnProperty.call(parsed, key)) return parsed
          } catch {
            // continue scanning
          }
          break
        }
      }
    }
  }
  return null
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<DataItemSummary[]>([]);
  const [previewPayload, setPreviewPayload] = useState<StudioPreviewPayload | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedPromptId = searchParams.get("id");
  const selectedPrompt = details.find((item) => item.id === selectedPromptId);
  const isHomeSelected = pathname === "/studio";
  const isPromptSectionSelected = pathname?.startsWith("/studio/prompts");
  const isHistorySelected = pathname === "/studio/prompts/history";

  const { setWorkersAllowed, terminateTask, terminateWorker } = useChatStreamingStore(
    // 使用 useShallow 优化性能: 仅在依赖项发生变化时重新计算
    useShallow(state => ({
      setWorkersAllowed: state.setWorkersAllowed,
      terminateTask: state.terminateTask,
      terminateWorker: state.terminateWorker
    }))
  );
  useEffect(() => {
    setWorkersAllowed(!!window.Worker);
    return () => {
      // 只在确实有初始化操作时才进行清理
      if (useChatStreamingStore.getState().workersAllowed) {
        setWorkersAllowed(false);
        terminateTask();
        terminateWorker();
      }
    }
  }, [setWorkersAllowed, terminateTask, terminateWorker]);


  // 连接数据库并初始化历史列表
  useEffect(() => {
    let isCanceled = false;
    (async () => {
      await DBManager.execute({ operationType: 'open' });
      if (isCanceled) await DBManager.execute({ operationType: 'close' });
      else {
        const allTopix = await DBManager.execute({ operationType: 'getSummary', indexName: 'topicIndex' });
        setDetails(allTopix as DataItemSummary[]);
      }
    })();
    return () => {
      isCanceled = true;
      (async () => {
        await DBManager.execute({ operationType: 'close' });
      })();
    }
  }, [setDetails]);

  // 处理对话历史列表更新事件
  useEffect(() => {
    const handleNewConversation: EventListener = (event) => {
      const customEvent = event as CustomEvent<DataItemSummary>;
      const { id, topic, timestamp } = customEvent.detail;
      setDetails((prevDetails) => [{ id, topic, timestamp }, ...prevDetails]);
    }
    const handleDeleteConversation: EventListener = event => {
      const customEvent = event as CustomEvent<{ id: string }>;
      const { id } = customEvent.detail;
      setDetails((prevDetails) => prevDetails.filter((detail) => detail.id !== id));
    }
    const handleUpdateConversation: EventListener = event => {
      const customEvent = event as CustomEvent<DataItemSummary>;
      const { id, topic, timestamp } = customEvent.detail;
      setDetails((prevDetails) => prevDetails.map((detail) => detail.id === id ? { id, topic, timestamp } : detail));
    }

    window.addEventListener('newConversation', handleNewConversation);
    window.addEventListener('deleteConversation', handleDeleteConversation);
    window.addEventListener('updateConversation', handleUpdateConversation);

    return () => {
      window.removeEventListener('newConversation', handleNewConversation);
      window.removeEventListener('deleteConversation', handleDeleteConversation);
      window.removeEventListener('updateConversation', handleUpdateConversation);
    }
  }, []);

  // 预览 预处理事件
  useEffect(() => {
    const handleOpenPreview: EventListener = (event) => {
      const customEvent = event as CustomEvent<StudioPreviewPayload>
      setPreviewPayload(customEvent.detail)
    }
    window.addEventListener("studioPreviewOpen", handleOpenPreview)
    return () => {
      window.removeEventListener("studioPreviewOpen", handleOpenPreview)
    }
  }, [])

  // 渲染预览
  const parsedPreview = useMemo(() => {
    if (!previewPayload) return null
    const structureObj = extractJsonObjectByKey(previewPayload.structureText, "uiTree")
    const styleObj = extractJsonObjectByKey(previewPayload.styleText, "styles")
    const rawUiTree = structureObj?.uiTree
    const rawStyles = styleObj?.styles

    let parsedTree: UiTreeNode | null = null
    let parseError = ""
    if (typeof rawUiTree === "string") {
      try {
        const parsed = JSON.parse(rawUiTree) as unknown
        parsedTree = isUiTreeNode(parsed) ? parsed : null
      } catch {
        parsedTree = null
      }
    } else if (isUiTreeNode(rawUiTree)) {
      parsedTree = rawUiTree
    }
    if (!parsedTree) {
      parseError = "未能从 STRUCTURE 展开内容中解析 uiTree。"
    }

    const styleClassById = Array.isArray(rawStyles)
      ? Object.fromEntries(
        rawStyles
          .filter((item): item is { id: string; className?: string } =>
            !!item && typeof item === "object" && "id" in item && typeof (item as { id: unknown }).id === "string",
          )
          .map((item) => [item.id, item.className ?? ""]),
      )
      : {}

    return {
      topic: previewPayload.topic,
      parsedTree,
      styleClassById,
      parseError,
    }
  }, [previewPayload])

  const isPreviewMode = previewPayload !== null


  return (
    <div className="min-h-dvh w-full bg-background">
      <div className="h-14 border-b flex items-center px-4">
        <div className="font-semibold">GenUI + Agent Studio</div>
        <div className="ml-auto flex gap-2">{/* actions */}</div>
      </div>

      <div className={cn("grid h-[calc(100dvh-56px)]", isPreviewMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[240px_1fr_300px]")}>
        {!isPreviewMode ? (
          <aside className="border-b p-3 flex flex-col gap-2 lg:border-b-0 lg:border-r overflow-y-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="home" className="border-b-0">
                <AccordionTrigger className="rounded-md px-2 py-2 text-sm hover:no-underline hover:bg-accent">
                  <div className="flex w-full items-center justify-between gap-2">
                    <Link
                      href="/studio"
                      className={cn(
                        "rounded-md px-2 py-1.5 text-sm transition-colors",
                        isHomeSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent text-foreground",
                      )}
                    >
                      Home
                    </Link>
                    {isPromptSectionSelected && selectedPrompt ? (
                      <span className="max-w-[110px] truncate rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {selectedPrompt.topic}
                      </span>
                    ) : null}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="flex flex-col gap-1 pl-2">
                    {details.slice(0, 5).map(({ id, topic }) => (
                      <Link
                        key={id}
                        href={`/studio/prompts?id=${id}`}
                        className={cn(
                          "group flex items-center justify-between rounded-md border px-2 py-1.5 text-sm transition-colors",
                          selectedPromptId === id
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground",
                        )}
                      >
                        {topic}
                        {selectedPromptId === id ? (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            选中
                          </span>
                        ) : null}
                      </Link>
                    ))}
                    <Separator />
                    <Link
                      key={"historyPrompts"}
                      href={`/studio/prompts/history`}
                      className={cn(
                        "group flex items-center justify-between rounded-md border px-2 py-1.5 text-sm transition-colors font-medium",
                        isHistorySelected
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-primary/20 bg-primary/5 text-primary hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
                      )}
                    >
                      所有历史记录
                    </Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Link href="/studio/projects">Projects</Link>
            <Link href="/studio/pages">Pages</Link>
            <Link href="/studio/workflows">Workflows</Link>
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground">Workspace Navigation</div>
          </aside>
        ) : null}
        <main className="flex-1 min-w-0 h-full overflow-hidden">
          <div className={cn("h-full", isPreviewMode ? "grid grid-cols-1 lg:grid-cols-[minmax(480px,58%)_1fr]" : "overflow-y-auto")}>
            <ChatDetailsContext.Provider value={details}>
              <div className={cn("h-full", isPreviewMode ? "overflow-y-auto border-r" : "")}>{children}</div>
            </ChatDetailsContext.Provider>
            {isPreviewMode ? (
              <div className="h-full overflow-y-auto bg-muted/20 p-4">
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{parsedPreview?.topic ?? "渲染预览"}</CardTitle>
                      {/* <CardDescription>来自最后一条 STRUCTURE / STYLE 展开内容</CardDescription> */}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPreviewPayload(null)}>
                      关闭预览
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {parsedPreview?.parsedTree ? (
                      <div className="rounded-md border bg-background p-3">
                        {renderNode(parsedPreview.parsedTree, parsedPreview.styleClassById)}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        {parsedPreview?.parseError || "暂无可渲染内容。"}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </main>
        {!isPreviewMode ? (
          <aside className="hidden border-l p-3 lg:block overflow-y-auto">
            <div className="text-sm text-muted-foreground">Inspector</div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}