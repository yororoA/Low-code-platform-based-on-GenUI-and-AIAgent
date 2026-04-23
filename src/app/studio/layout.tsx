'use client'
import { Suspense, useCallback, useEffect, type ReactNode, useMemo, useRef, useState, type MouseEvent } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { HomeIcon, WorkflowIcon, HistoryIcon, ChevronRightIcon } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { DBManager } from "@/lib/dbtest"
import { cn } from "@/lib/utils"
import { DataItemSummary } from "@/types"
import { ChatDetailsContext } from "@/contexts";
import { isUiTreeNode, renderNode, type UiTreeNode } from "@/lib/renderByAST";
import { InteractionResolver } from "@/lib/interactionResolver";
import { PageManager } from "@/lib/pageManager";
import type { InteractionSlot, InteractionDefinition, PageDefinition, InteractionResponsePayload } from "@/types/interaction";
import { useChatStreamingStore } from "@/store/chatStreamingStore";
import { useWorkflowStore } from "@/store/workflowStore";
import { useShallow } from "zustand/shallow"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"


type StudioPreviewPayload = {
  topic: string
  uiTree: unknown
  styles: unknown
  interactions: unknown
  pages: unknown
}

type TimelineChildItem = {
  id: string
  label: string
  targetId: string
  type: "stage" | "text" | "preview" | "tool"
}

type TimelineRoundItem = {
  id: string
  timestamp: string
  assistantTargetId: string
  userText: string
  assistantTitle: string
  children: TimelineChildItem[]
}

function StudioLayoutContent({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<DataItemSummary[]>([]);
  const [previewPayload, setPreviewPayload] = useState<StudioPreviewPayload | null>(null);
  const [timelineRounds, setTimelineRounds] = useState<TimelineRoundItem[]>([])
  const [activeAssistantTargetId, setActiveAssistantTargetId] = useState<string>("")
  const inspectorRef = useRef<HTMLElement | null>(null)
  const [hoverUserText, setHoverUserText] = useState<string>("")
  const [hoverTop, setHoverTop] = useState<number>(0)
  const [hoverVisible, setHoverVisible] = useState<boolean>(false)
  const interactionResolverRef = useRef<InteractionResolver>(new InteractionResolver())
  const pageManagerRef = useRef<PageManager>(new PageManager("main"))
  const [interactionsById, setInteractionsById] = useState<Record<string, import("@/types/interaction").ResolvedInteraction>>({})
  const [interactionLoading, setInteractionLoading] = useState(false)
  const [modalContent, setModalContent] = useState<{
    type: "dialog" | "sheet" | "drawer" | "popover"
    title: string
    parsedTree: UiTreeNode | null
    styleClassById: Record<string, string>
    interactions: InteractionDefinition[]
  } | null>(null)
  const [activePageId, setActivePageId] = useState<string>("main")
  const [pageTrees, setPageTrees] = useState<Record<string, {
    parsedTree: UiTreeNode | null
    styleClassById: Record<string, string>
    interactions: InteractionDefinition[]
  }>>({})
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedPromptId = searchParams.get("id");
  const selectedPrompt = details.find((item) => item.id === selectedPromptId);
  const isHomeSelected = pathname === "/studio";
  const isPromptSectionSelected = pathname?.startsWith("/studio/prompts");
  const isHistorySelected = pathname === "/studio/prompts/history";
  const isWorkflowProject = pathname?.includes("/studio/workflows/project/");
  const shouldShowInspector = (isPromptSectionSelected && !isHistorySelected) || isWorkflowProject;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleInteraction = useCallback(async (slot: InteractionSlot, _nodeId: string) => {
    switch (slot.type) {
      case "navigation": {
        if (pageManagerRef.current.hasPage(slot.target)) {
          const page = pageManagerRef.current.getPage(slot.target)
          if (page?.uiTree) {
            setActivePageId(slot.target)
            setPageTrees(prev => ({
              ...prev,
              [slot.target]: {
                parsedTree: page.uiTree,
                styleClassById: Object.fromEntries(page.styles.map(s => [s.id, s.className ?? ""])),
                interactions: page.interactions,
              }
            }))
            pageManagerRef.current.switchToPage(slot.target)
          }
          return
        }
        setInteractionLoading(true)
        try {
          const resp = await fetch("/api/chat/interaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: slot.type,
              description: slot.description,
              target: slot.target,
              params: slot.params,
              currentPageContext: typeof previewPayload?.uiTree === "string" ? previewPayload.uiTree : JSON.stringify(previewPayload?.uiTree ?? ""),
            } satisfies import("@/types/interaction").InteractionRequestPayload),
          })
          const data: InteractionResponsePayload = await resp.json()
          let parsedTree: UiTreeNode | null = null
          try {
            const raw = typeof data.uiTree === "string" ? JSON.parse(data.uiTree) : data.uiTree
            parsedTree = isUiTreeNode(raw) ? raw : null
          } catch { /* ignore */ }
          const styleClassById = Object.fromEntries(
            (data.styles ?? []).map(s => [s.id, s.className ?? ""])
          )
          const interactions = data.interactions ?? []
          const pages = data.pages ?? []
          const pageDef: PageDefinition = {
            id: slot.target,
            name: slot.target,
            description: slot.description,
            isGenerated: true,
          }
          pageManagerRef.current.setActivePage({
            definition: pageDef,
            uiTree: parsedTree,
            styles: data.styles ?? [],
            interactions,
          })
          for (const p of pages) {
            pageManagerRef.current.setActivePage({
              definition: p,
              uiTree: null,
              styles: [],
              interactions: [],
            })
          }
          setPageTrees(prev => ({
            ...prev,
            [slot.target]: { parsedTree, styleClassById, interactions },
          }))
          setActivePageId(slot.target)
          pageManagerRef.current.switchToPage(slot.target)
          if (interactions.length > 0) {
            interactionResolverRef.current.registerInteractions(interactions)
            setInteractionsById(interactionResolverRef.current.resolveAll())
          }
        } finally {
          setInteractionLoading(false)
        }
        break
      }
      case "modal-open": {
        setInteractionLoading(true)
        try {
          const resp = await fetch("/api/chat/interaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: slot.type,
              description: slot.description,
              modalType: slot.modalType,
              contentDescription: slot.contentDescription,
              currentPageContext: typeof previewPayload?.uiTree === "string" ? previewPayload.uiTree : JSON.stringify(previewPayload?.uiTree ?? ""),
            } satisfies import("@/types/interaction").InteractionRequestPayload),
          })
          const data: InteractionResponsePayload = await resp.json()
          let parsedTree: UiTreeNode | null = null
          try {
            const raw = typeof data.uiTree === "string" ? JSON.parse(data.uiTree) : data.uiTree
            parsedTree = isUiTreeNode(raw) ? raw : null
          } catch { /* ignore */ }
          const styleClassById = Object.fromEntries(
            (data.styles ?? []).map(s => [s.id, s.className ?? ""])
          )
          const interactions = data.interactions ?? []
          setModalContent({
            type: slot.modalType,
            title: slot.contentDescription,
            parsedTree,
            styleClassById,
            interactions,
          })
          if (interactions.length > 0) {
            interactionResolverRef.current.registerInteractions(interactions)
            setInteractionsById(interactionResolverRef.current.resolveAll())
          }
        } finally {
          setInteractionLoading(false)
        }
        break
      }
      case "form-submit": {
        setInteractionLoading(true)
        try {
          const resp = await fetch("/api/chat/interaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: slot.type,
              description: slot.description,
              onSubmitDescription: slot.onSubmitDescription,
              currentPageContext: typeof previewPayload?.uiTree === "string" ? previewPayload.uiTree : JSON.stringify(previewPayload?.uiTree ?? ""),
            } satisfies import("@/types/interaction").InteractionRequestPayload),
          })
          const data: InteractionResponsePayload = await resp.json()
          let parsedTree: UiTreeNode | null = null
          try {
            const raw = typeof data.uiTree === "string" ? JSON.parse(data.uiTree) : data.uiTree
            parsedTree = isUiTreeNode(raw) ? raw : null
          } catch { /* ignore */ }
          const styleClassById = Object.fromEntries(
            (data.styles ?? []).map(s => [s.id, s.className ?? ""])
          )
          const interactions = data.interactions ?? []
          setModalContent({
            type: "dialog",
            title: slot.onSubmitDescription,
            parsedTree,
            styleClassById,
            interactions,
          })
          if (interactions.length > 0) {
            interactionResolverRef.current.registerInteractions(interactions)
            setInteractionsById(interactionResolverRef.current.resolveAll())
          }
        } finally {
          setInteractionLoading(false)
        }
        break
      }
      case "data-fetch": {
        setInteractionLoading(true)
        try {
          const resp = await fetch("/api/chat/interaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: slot.type,
              description: slot.description,
              currentPageContext: typeof previewPayload?.uiTree === "string" ? previewPayload.uiTree : JSON.stringify(previewPayload?.uiTree ?? ""),
            } satisfies import("@/types/interaction").InteractionRequestPayload),
          })
          const data: InteractionResponsePayload = await resp.json()
          if (data.interactions && data.interactions.length > 0) {
            interactionResolverRef.current.registerInteractions(data.interactions)
            setInteractionsById(interactionResolverRef.current.resolveAll())
          }
        } finally {
          setInteractionLoading(false)
        }
        break
      }
      case "custom": {
        break
      }
      default:
        break
    }
  }, [previewPayload])

  useEffect(() => {
    interactionResolverRef.current.setInteractionCallback((slot, nodeId) => {
      handleInteraction(slot, nodeId)
    })
  }, [handleInteraction])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interactionResolverRef.current.setStateChangeCallback((_changedNodeIds) => {
      setInteractionsById({ ...interactionResolverRef.current.resolveAll() })
    })
  }, [])

  const { setWorkersAllowed, terminateTask, terminateWorker } = useChatStreamingStore(
    useShallow(state => ({
      setWorkersAllowed: state.setWorkersAllowed,
      terminateTask: state.terminateTask,
      terminateWorker: state.terminateWorker
    }))
  );

  const { currentProject } = useWorkflowStore();
  const { goToHistoryIndex, currentHistoryIndex } = useWorkflowStore();
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

  useEffect(() => {
    const handleTimelineUpdate: EventListener = (event) => {
      const customEvent = event as CustomEvent<TimelineRoundItem[]>
      setTimelineRounds(customEvent.detail ?? [])
    }
    const handleActiveTimeline: EventListener = (event) => {
      const customEvent = event as CustomEvent<{ assistantTargetId?: string }>
      setActiveAssistantTargetId(customEvent.detail?.assistantTargetId ?? "")
    }
    window.addEventListener("studioTimelineUpdate", handleTimelineUpdate)
    window.addEventListener("studioTimelineActiveChange", handleActiveTimeline)
    return () => {
      window.removeEventListener("studioTimelineUpdate", handleTimelineUpdate)
      window.removeEventListener("studioTimelineActiveChange", handleActiveTimeline)
    }
  }, [])

  const handleTimelineScrollTo = (targetId: string) => {
    window.dispatchEvent(new CustomEvent("studioTimelineScrollTo", { detail: { targetId } }))
  }

  const formatTimelineTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) return timestamp
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date)
  }

  const handleHoverEnter = (event: MouseEvent<HTMLElement>, userText: string) => {
    const asideRect = inspectorRef.current?.getBoundingClientRect()
    const targetRect = event.currentTarget.getBoundingClientRect()
    if (!asideRect) return
    setHoverTop(targetRect.top - asideRect.top)
    setHoverUserText(userText)
    setHoverVisible(true)
  }

  const handleHoverLeave = () => {
    setHoverVisible(false)
  }

  // 渲染预览
  const parsedPreview = useMemo(() => {
    if (!previewPayload) return null

    const rawUiTree = previewPayload.uiTree
    const rawStyles = previewPayload.styles
    const rawInteractions = previewPayload.interactions
    const rawPages = previewPayload.pages

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

    const parsedInteractions: InteractionDefinition[] = Array.isArray(rawInteractions)
      ? rawInteractions.filter(
          (item): item is InteractionDefinition =>
            !!item && typeof item === "object" && "nodeId" in item && "slot" in item,
        )
      : []

    const parsedPages: PageDefinition[] = Array.isArray(rawPages)
      ? rawPages.filter(
          (item): item is PageDefinition =>
            !!item && typeof item === "object" && "id" in item && "name" in item,
        )
      : []

    return {
      topic: previewPayload.topic,
      parsedTree,
      styleClassById,
      parseError,
      interactions: parsedInteractions,
      pages: parsedPages,
    }
  }, [previewPayload])

  useEffect(() => {
    if (!parsedPreview) return
    interactionResolverRef.current.clear()
    if (parsedPreview.interactions.length > 0) {
      interactionResolverRef.current.registerInteractions(parsedPreview.interactions)
      setInteractionsById(interactionResolverRef.current.resolveAll())
    } else {
      setInteractionsById({})
    }
    pageManagerRef.current.clear()
    pageManagerRef.current.setActivePage({
      definition: { id: "main", name: "Main", description: "Main page", isGenerated: true },
      uiTree: parsedPreview.parsedTree,
      styles: Array.isArray(previewPayload?.styles)
        ? previewPayload.styles.filter((item): item is { id: string; className?: string; classNames?: Record<string, string> } =>
            !!item && typeof item === "object" && "id" in item)
        : [],
      interactions: parsedPreview.interactions,
    })
    for (const p of parsedPreview.pages) {
      pageManagerRef.current.setActivePage({
        definition: p,
        uiTree: null,
        styles: [],
        interactions: [],
      })
    }
    setActivePageId("main")
    setPageTrees({
      main: {
        parsedTree: parsedPreview.parsedTree,
        styleClassById: parsedPreview.styleClassById,
        interactions: parsedPreview.interactions,
      }
    })
  }, [parsedPreview, previewPayload])

  const isPreviewMode = previewPayload !== null


  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden">
        {!isPreviewMode && (
          <Sidebar variant="inset" className="border-r">
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <WorkflowIcon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">GenUI Studio</span>
                  <span className="text-xs text-muted-foreground">Agent Platform</span>
                </div>
              </div>
            </SidebarHeader>
            
            <SidebarSeparator />
            
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>导航</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={isHomeSelected}
                        tooltip="主页"
                      >
                        <Link href="/studio">
                          <HomeIcon className="h-4 w-4" />
                          <span>Home</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        isActive={pathname?.startsWith("/studio/workflows")}
                        tooltip="工作流管理"
                      >
                        <Link href="/studio/workflows">
                          <WorkflowIcon className="h-4 w-4" />
                          <span>Workflows</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              
              <SidebarSeparator />
              
              <SidebarGroup>
                <SidebarGroupLabel>最近对话</SidebarGroupLabel>
                <SidebarGroupContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1 pr-2">
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
                          <span className="truncate">{topic}</span>
                          {selectedPromptId === id && (
                            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              选中
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="mt-2">
                    <SidebarMenuButton 
                      asChild 
                      isActive={isHistorySelected}
                      className="w-full"
                    >
                      <Link href="/studio/prompts/history">
                        <HistoryIcon className="h-4 w-4" />
                        <span>所有历史记录</span>
                        <ChevronRightIcon className="ml-auto h-4 w-4" />
                      </Link>
                    </SidebarMenuButton>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            
            <SidebarFooter>
              <div className="text-xs text-muted-foreground px-2">
                Workspace Navigation
              </div>
            </SidebarFooter>
          </Sidebar>
        )}
        
        <SidebarInset>
          <div className="flex flex-col h-full">
            {!isPreviewMode && (
              <header className="flex h-14 items-center gap-4 border-b bg-background px-6 shrink-0">
                <SidebarTrigger />
                <div className="flex-1">
                  <h1 className="text-lg font-semibold">GenUI + Agent Studio</h1>
                </div>
                <div className="flex items-center gap-2">
                  {isPromptSectionSelected && selectedPrompt && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="max-w-[200px] truncate rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {selectedPrompt.topic}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{selectedPrompt.topic}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </header>
            )}
            
            <div className="flex flex-1 min-h-0">
              <main className={cn("flex-1 min-w-0 overflow-hidden", isPreviewMode && "max-w-[60%]")}>
                <ChatDetailsContext.Provider value={details}>
                  <div className="h-full min-h-0 overflow-hidden overscroll-contain">
                    {children}
                  </div>
                </ChatDetailsContext.Provider>
              </main>
              {isPreviewMode && (
                <aside className="w-[50%] min-w-[20%] max-w-[80%] border-l bg-background flex flex-col h-full min-h-0 shrink-0 overflow-hidden">
                  <div className="border-b p-4 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activePageId !== "main" && pageManagerRef.current.canGoBack() && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          pageManagerRef.current.goBack()
                          const prevId = pageManagerRef.current.getActivePageId()
                          setActivePageId(prevId)
                        }}>
                          ← 返回
                        </Button>
                      )}
                      <h2 className="text-sm font-semibold">{parsedPreview?.topic ?? "渲染预览"}{activePageId !== "main" ? ` / ${activePageId}` : ""}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {interactionLoading && (
                        <span className="text-xs text-muted-foreground animate-pulse">交互加载中...</span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => {
                        setPreviewPayload(null)
                        setModalContent(null)
                        setActivePageId("main")
                        setPageTrees({})
                        interactionResolverRef.current.clear()
                        setInteractionsById({})
                      }}>
                        关闭预览
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 p-4 overscroll-contain bg-muted/20">
                    {(() => {
                      const currentPage = pageTrees[activePageId]
                      const tree = currentPage?.parsedTree ?? parsedPreview?.parsedTree
                      const styles = currentPage?.styleClassById ?? parsedPreview?.styleClassById
                      if (tree) {
                        return (
                          <div className="rounded-md border bg-background p-3">
                            {renderNode(tree, styles ?? {}, interactionsById)}
                          </div>
                        )
                      }
                      return (
                        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                          {parsedPreview?.parseError || "暂无可渲染内容。"}
                        </div>
                      )
                    })()}
                  </ScrollArea>
                  {modalContent && (() => {
                    const modalTree = modalContent.parsedTree
                    const modalStyles = modalContent.styleClassById
                    const modalInteractions = interactionsById
                    const contentEl = modalTree ? (
                      <div className="p-4">
                        {renderNode(modalTree, modalStyles, modalInteractions)}
                      </div>
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">暂无内容</div>
                    )
                    switch (modalContent.type) {
                      case "dialog":
                        return (
                          <Dialog open onOpenChange={(open) => { if (!open) setModalContent(null) }}>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>{modalContent.title}</DialogTitle>
                                <DialogDescription>{modalContent.title}</DialogDescription>
                              </DialogHeader>
                              {contentEl}
                            </DialogContent>
                          </Dialog>
                        )
                      case "sheet":
                        return (
                          <Sheet open onOpenChange={(open) => { if (!open) setModalContent(null) }}>
                            <SheetContent className="max-w-2xl overflow-auto">
                              <SheetHeader>
                                <SheetTitle>{modalContent.title}</SheetTitle>
                                <SheetDescription>{modalContent.title}</SheetDescription>
                              </SheetHeader>
                              {contentEl}
                            </SheetContent>
                          </Sheet>
                        )
                      case "drawer":
                        return (
                          <Drawer open onOpenChange={(open) => { if (!open) setModalContent(null) }}>
                            <DrawerContent className="max-h-[80vh]">
                              <DrawerHeader>
                                <DrawerTitle>{modalContent.title}</DrawerTitle>
                                <DrawerDescription>{modalContent.title}</DrawerDescription>
                              </DrawerHeader>
                              {contentEl}
                            </DrawerContent>
                          </Drawer>
                        )
                      case "popover":
                        return (
                          <Dialog open onOpenChange={(open) => { if (!open) setModalContent(null) }}>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>{modalContent.title}</DialogTitle>
                                <DialogDescription>{modalContent.title}</DialogDescription>
                              </DialogHeader>
                              {contentEl}
                            </DialogContent>
                          </Dialog>
                        )
                      default:
                        return null
                    }
                  })()}
                </aside>
              )}
              
              {!isPreviewMode && shouldShowInspector && (
                <aside ref={inspectorRef} className="w-80 border-l bg-background flex h-full min-h-0 flex-col shrink-0 overflow-hidden">
                  <div className="border-b p-4 shrink-0">
                    <h2 className="text-sm font-semibold">Inspector</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isWorkflowProject ? '操作历史记录' : '时间轴与对话记录'}
                    </p>
                  </div>
                  
                  <ScrollArea className="flex-1 min-h-0 p-4 overscroll-contain">
                    {isWorkflowProject ? (
                      currentProject && currentProject.historyOperations.length > 0 ? (
                        <div className="relative pl-5">
                          <div className="absolute left-2 top-0 bottom-0 w-px bg-foreground/25" />
                          <div className="space-y-2">
                            {currentProject.historyOperations.map((operation, index) => {
                              const isCurrentPosition = index === currentHistoryIndex;
                              return (
                                <div 
                                  key={index} 
                                  className={cn(
                                    "relative rounded-md border px-3 py-2 cursor-pointer transition-all",
                                    isCurrentPosition 
                                      ? "border-primary/60 bg-primary/10" 
                                      : "border-foreground/20 bg-card hover:border-primary/30"
                                  )}
                                  onClick={() => goToHistoryIndex(index)}
                                >
                                  <span className={cn(
                                    "absolute -left-[18px] top-3 h-2.5 w-2.5 rounded-full border",
                                    isCurrentPosition 
                                      ? "border-primary bg-primary" 
                                      : "border-primary/70 bg-primary/30"
                                  )} />
                                  <div className="text-xs font-medium">{operation.description}</div>
                                  <div className="text-[11px] text-muted-foreground mt-1">
                                    {new Date(operation.timestamp).toLocaleString('zh-CN', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      second: '2-digit',
                                      hour12: false,
                                    })}
                                  </div>
                                  {isCurrentPosition && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                      <span className="text-[10px] text-primary font-medium">当前</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="py-4 text-xs text-muted-foreground">
                            暂无操作历史记录，进行节点操作后会在这里显示。
                          </CardContent>
                        </Card>
                      )
                    ) : timelineRounds.length === 0 ? (
                      <Card>
                        <CardContent className="py-4 text-xs text-muted-foreground">
                          暂无时间轴数据，发送消息后会在这里按轮次记录 user / assistant 信息。
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="relative pl-5">
                        <div className="absolute left-2 top-0 bottom-0 w-px bg-foreground/25" />
                        <Accordion type="multiple" className="space-y-2">
                          {timelineRounds.map((round) => (
                            <AccordionItem key={round.id} value={round.id} className={cn("relative overflow-visible rounded-md border border-foreground/20 bg-card px-2 py-1", activeAssistantTargetId === round.assistantTargetId ? "border-primary/60 bg-primary/5" : "")}>
                              <span className="absolute -left-[18px] top-4 h-2.5 w-2.5 rounded-full border border-primary/70 bg-primary/30" />
                              <div
                                className="group relative"
                                onMouseEnter={(event) => handleHoverEnter(event, round.userText)}
                                onMouseLeave={handleHoverLeave}
                              >
                                <div className="px-2 pb-1 text-[11px] font-medium text-muted-foreground">
                                  {formatTimelineTime(round.timestamp)}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-auto w-full justify-start px-2 py-1.5 text-left", activeAssistantTargetId === round.assistantTargetId ? "bg-primary/10 text-primary hover:bg-primary/15" : "")}
                                  onClick={() => handleTimelineScrollTo(round.assistantTargetId)}
                                >
                                  <span className="line-clamp-2 text-xs">{round.assistantTitle}</span>
                                </Button>
                              </div>
                              <AccordionTrigger className="px-2 py-1.5 text-xs hover:no-underline">
                                展开子项 ({round.children.length})
                              </AccordionTrigger>
                              <AccordionContent className="pb-1">
                                <div className="space-y-1 pl-2">
                                  {round.children.map((child) => (
                                    <div
                                      key={child.id}
                                      className="group relative"
                                      onMouseEnter={(event) => handleHoverEnter(event, round.userText)}
                                      onMouseLeave={handleHoverLeave}
                                    >
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-auto w-full justify-start px-2 py-1 text-left text-xs"
                                        onClick={() => handleTimelineScrollTo(child.targetId)}
                                      >
                                        <span className="line-clamp-2">{child.label}</span>
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </ScrollArea>
                  
                  <Card
                    className={cn(
                      "pointer-events-none absolute right-full z-30 mr-2 w-64 border shadow-md transition-all duration-200 ease-out",
                      hoverVisible ? "opacity-100 visible" : "opacity-0 invisible",
                    )}
                    style={{ top: hoverTop }}
                  >
                    <CardHeader className="py-2">
                      <CardTitle className="text-xs">{hoverUserText}</CardTitle>
                    </CardHeader>
                  </Card>
                </aside>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading Studio...</div>}>
      <StudioLayoutContent>{children}</StudioLayoutContent>
    </Suspense>
  )
}