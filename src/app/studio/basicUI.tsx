"use client"

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AgentMessage } from "@/types"
import { DBManager } from "@/lib/dbtest"
import { getShowResponsePayload, strToHexStr, dispatchEvent, generateHexId } from "@/lib/utils"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { DataItem, DataItemSummary } from "@/types";
import { useChatStreamingStore } from "@/store/chatStreamingStore";
import { useShallow } from "zustand/shallow"

const STAGE_INFO_RE = /^\[(ADMIN|STRUCTURE|ALIGNMENT|STYLE|INTERACTION|PAGES)\]\s*:?\s*(.+)$/i

function extractStructureAndStyleFromParts(message: AgentMessage): {
  uiTree: unknown
  styles: unknown
  interactions: unknown
  pages: unknown
} {
  let uiTree: unknown = null
  let styles: unknown = null
  let interactions: unknown = null
  let pages: unknown = null
  if (!message.parts) return { uiTree, styles, interactions, pages }
  for (const part of message.parts) {
    if (part.type === "show-response") {
      const data = part.data;
      if (data.uiTree && uiTree === null) uiTree = data.uiTree;
      if (data.styles && styles === null) styles = data.styles;
      if (data.interactions && interactions === null) interactions = data.interactions;
      if (data.pages && pages === null) pages = data.pages;
      continue;
    }
    if (part.type === "structure-output") {
      if (part.uiTree && uiTree === null) uiTree = part.uiTree;
      if (part.interactions && interactions === null) interactions = part.interactions;
      if (part.pages && pages === null) pages = part.pages;
      continue;
    }
    if (part.type === "style-output") {
      if (part.styles && styles === null) styles = part.styles;
      continue;
    }
    if (part.type !== "text") continue
    const text = part.text.trim()
    if (!text.startsWith("{")) continue
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      if (parsed && typeof parsed === "object") {
        if ("uiTree" in parsed && uiTree === null) uiTree = parsed.uiTree
        if ("styles" in parsed && styles === null) styles = parsed.styles
        if ("interactions" in parsed && interactions === null) interactions = parsed.interactions
        if ("pages" in parsed && pages === null) pages = parsed.pages
      }
    } catch {
      // not valid JSON
    }
  }
  return { uiTree, styles, interactions, pages }
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case "ADMIN": return "思考中..."
    case "STRUCTURE": return "结构设计中..."
    case "ALIGNMENT": return "对齐检查中..."
    case "STYLE": return "样式设计中..."
    case "INTERACTION": return "交互定义中..."
    case "PAGES": return "页面定义中..."
    default: return `${stage}...`
  }
}


type DisplayInfo =
  | { type: "stage"; stage: string; text: string; details: string[] }
  | { type: "tool"; text: string }
  | { type: "text"; text: string }
  | { type: "node-tracking"; node: string }
  | { type: "error"; message: string }

type StagePreviewPayload = {
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
  type: "stage" | "text" | "preview" | "tool" | "node-tracking"
}

type TimelineRoundItem = {
  id: string
  timestamp: string
  assistantTargetId: string
  userText: string
  assistantTitle: string
  children: TimelineChildItem[]
}

function useLocalStorageField(key: string, field: string): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const handler = (e: StorageEvent) => { if (e.key === key) cb(); };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [key]);

  const getSnapshot = useCallback(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? !!(JSON.parse(raw)[field]) : false;
    } catch {
      return false;
    }
  }, [key, field]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default function BasicUI() {
  const router = useRouter();
  const [input, setInput] = useState<string>("");
  const thisDetailRef = useRef<{ id: string; topic: string; timestamp: Date }>({
    id: "",
    topic: "New Conversation",
    timestamp: new Date(),
  });
  const CACHE_DEBOUNCE_TIMEOUT = 1000;
  const [activePromptId, setActivePromptId] = useState<string>("");
  const apiKeyConfigured = useLocalStorageField("genui-llm-config", "apiKey");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [roundTimeMap, setRoundTimeMap] = useState<Record<string, string>>({});
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const stageStartMapRef = useRef<Map<string, number>>(new Map());
  const [stageElapsed, setStageElapsed] = useState<number>(0);
  const [activeStageKey, setActiveStageKey] = useState<string>("");

  const currentMessageTaskId = useChatStreamingStore(
    (state) => (activePromptId ? state.promptToTaskMap.get(activePromptId) ?? "" : "")
  );
  const currentTask = useChatStreamingStore(
    useShallow(state => state.tasksProcessingMap.get(currentMessageTaskId))
  );
  const { send, cancel, terminateTask, onlineStatusToggle, initPromptData } = useChatStreamingStore(
    useShallow(state => ({
      send: state.send,
      cancel: state.cancel,
      terminateTask: state.terminateTask,
      onlineStatusToggle: state.onlineStatusToggle,
      initPromptData: state.initPromptData,
    }))
  );
  const promptData = useChatStreamingStore(
    useShallow(state => activePromptId ? state.promptDataMap.get(activePromptId) : undefined)
  );
  const normalizedMessages = useMemo(() => promptData?.messages ?? [], [promptData?.messages]);
  const topic = promptData?.topic ?? "New Conversation";
  const getDBMessagesWorkerRef = useRef<Worker | null>(null);

  // 初始化获取历史记录线程
  useEffect(() => {
    getDBMessagesWorkerRef.current = new Worker(new URL("@/workers/chatDBWorker.ts", import.meta.url));
    getDBMessagesWorkerRef.current.onmessage = (event: MessageEvent<DataItem>) => {
      const history = event.data as DataItem;
      if (history) {
        initPromptData(history.id, history);
        setActivePromptId(history.id);
        const taskId = useChatStreamingStore.getState().promptToTaskMap.get(history.id);
        if (taskId) {
          onlineStatusToggle(taskId, "online");
        }
        thisDetailRef.current = {
          id: history.id,
          topic: history.topic,
          timestamp: history.timestamp,
        }
      }
    }
    return () => {
      getDBMessagesWorkerRef.current?.terminate();
      getDBMessagesWorkerRef.current = null;
    }
  }, [initPromptData, onlineStatusToggle]);

  // Subscribe to store updates and cache round timestamps outside of render.
  useEffect(() => {
    if (!activePromptId) return;

    const seedRoundTimes = (messages: AgentMessage[] | undefined) => {
      if (!messages || messages.length === 0) return;
      setRoundTimeMap((prev) => {
        let changed = false;
        const next: Record<string, string> = { ...prev };
        for (let index = 0; index < messages.length; index++) {
          const message = messages[index];
          if (message.role !== "assistant") continue;
          const roundId = `round-${message.id}-${index}`;
          if (!next[roundId]) {
            next[roundId] = new Date().toISOString();
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    const unsubscribe = useChatStreamingStore.subscribe((state, prevState) => {
      const nextMessages = state.promptDataMap.get(activePromptId)?.messages;
      const prevMessages = prevState.promptDataMap.get(activePromptId)?.messages;
      if (!nextMessages || nextMessages.length === 0) return;
      if (nextMessages === prevMessages) return;

      seedRoundTimes(nextMessages);
    });

    // Seed once for existing history after subscription is set.
    queueMicrotask(() => {
      const messages = useChatStreamingStore
        .getState()
        .promptDataMap
        .get(activePromptId)?.messages;
      seedRoundTimes(messages);
    });

    return () => {
      unsubscribe();
    };
  }, [activePromptId]);

  // 处理任务完成/取消
  useEffect(() => {
    if (!currentTask) return;
    if (currentTask.status !== "canceled" && currentTask.status !== "completed") return;
    terminateTask(currentMessageTaskId);
  }, [currentTask, terminateTask, currentMessageTaskId]);

  // 初始化获取历史数据
  const searchParams = useSearchParams();
  useEffect(() => {
    const promptId = searchParams.get("id");
    if (promptId) {
      thisDetailRef.current.id = promptId;
      if (getDBMessagesWorkerRef.current) {
        getDBMessagesWorkerRef.current.postMessage({ operationType: "get", id: promptId });
      } else {
        (async () => {
          const history = (await DBManager.execute({
            operationType: "get",
            id: promptId,
          })) as DataItem;
          if (history) {
            initPromptData(history.id, history);
            setActivePromptId(history.id);
            const taskId = useChatStreamingStore.getState().promptToTaskMap.get(promptId);
            if (taskId) {
              onlineStatusToggle(taskId, "online");
            }
            thisDetailRef.current = {
              id: history.id,
              topic: history.topic,
              timestamp: history.timestamp,
            }
          }
        })();
      }
    }
  }, [searchParams, onlineStatusToggle, initPromptData]);

  useEffect(() => {
    if (normalizedMessages.length === 0) return
    const updateTimer = setTimeout(async () => {
      const d = thisDetailRef.current;
      let extractedTopic = "";
      const assistantMessages = normalizedMessages.filter(m => m.role === "assistant");
      for (let i = assistantMessages.length - 1; i >= 0; i--) {
        const payload = getShowResponsePayload(assistantMessages[i]);
        if (payload?.topic) {
          extractedTopic = payload.topic;
          break;
        }
      }
      if (extractedTopic) d.topic = extractedTopic;
      if (d.id) {
        try {
          await DBManager.execute({
            operationType: "update",
            data: { ...d, messages: normalizedMessages },
          });
          dispatchEvent<DataItemSummary>("updateConversation", d);
        } catch (error) {
          console.error("DB Update Error: ", error)
          setErrorMessage("对话数据保存失败，请检查网络或刷新页面重试。")
        }
      }
    }, CACHE_DEBOUNCE_TIMEOUT);
    return () => {
      clearTimeout(updateTimer);
    }
  }, [normalizedMessages, router]);

  // 会话切换(页面卸载)
  useEffect(() => {
    return () => {
      if (currentMessageTaskId) {
        onlineStatusToggle(currentMessageTaskId, "offline");
      }
    }
  }, [onlineStatusToggle, currentMessageTaskId]);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [errorMessage]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");
    const isNewConversation = !thisDetailRef.current.id;
    let currentPromptId = thisDetailRef.current.id;

    if (isNewConversation) {
      const newId = strToHexStr(`${text}${Date.now().toString()}${Math.ceil(Math.random() * 1e6).toString()}`);
      thisDetailRef.current.id = newId;
      thisDetailRef.current.timestamp = new Date();
      currentPromptId = newId;
      setActivePromptId(newId);
      dispatchEvent<DataItemSummary>("newConversation", thisDetailRef.current);
      router.push(`/studio/prompts?id=${newId}`);
    }

    setActivePromptId(currentPromptId);
    const userMessage: AgentMessage = {
      role: "user",
      id: generateHexId(),
      parts: [{ type: "text", text }],
    };
    const baseMessages = promptData?.messages ?? [];
    const nextMessages = [...baseMessages, userMessage];

    const taskIdForCurrentPrompt = useChatStreamingStore.getState().promptToTaskMap.get(currentPromptId);
    if (taskIdForCurrentPrompt) {
      terminateTask(taskIdForCurrentPrompt);
    }
    const taskId = `task_${Date.now()}`;
    send(currentPromptId, taskId, nextMessages, window.location.origin);
  }

  const handleStop = async () => {
    const taskIdForCurrentPrompt = useChatStreamingStore.getState().promptToTaskMap.get(activePromptId);
    if (taskIdForCurrentPrompt) cancel(taskIdForCurrentPrompt);
  }

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const isStreaming = currentTask && (currentTask.status === "streaming" || currentTask.status === 'submitted');
  const canSend = input.trim().length > 0 && !isStreaming;

  // 追踪当前阶段变化并更新 elapsed time
  useEffect(() => {
    if (!isStreaming) return;

    const timer = setInterval(() => {
      const lastAssistant = [...normalizedMessages].reverse().find(m => m.role === "assistant");
      const lastStagePart = lastAssistant?.parts?.filter(p => p.type === "stage-info").pop();
      const currentKey = lastStagePart?.type === "stage-info" ? `${lastStagePart.stage}|${lastStagePart.message}` : "";

      setActiveStageKey(prev => {
        const key = currentKey || prev;
        if (key && key !== prev) {
          if (!stageStartMapRef.current.has(key)) {
            stageStartMapRef.current.set(key, Date.now());
          }
        }
        return key || prev;
      });

      setStageElapsed(() => {
        const key = currentKey;
        const start = key ? stageStartMapRef.current.get(key) : undefined;
        return start ? Math.floor((Date.now() - start) / 1000) : 0;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      setActiveStageKey(prev => (prev !== "" ? "" : prev));
      setStageElapsed(prev => (prev !== 0 ? 0 : prev));
    };
  }, [isStreaming, normalizedMessages]);

  const getMessageText = (message: AgentMessage) =>
    message.parts
      ?.map((part) => (part.type === "text" ? part.text : ""))
      .join("\n")
      .trim()

  const getAssistantInfos = (message: AgentMessage): DisplayInfo[] => {
    const infos: DisplayInfo[] = []
    if (message.role !== "assistant" || !message.parts) return infos

    const seenStage = new Set<string>()
    const stageIndexByKey = new Map<string, number>()
    let activeStageIndex: number | null = null

    for (const part of message.parts) {
      if (part.type === "show-response") {
        const showData = part.data;
        const toolText = showData?.topic;
        if (toolText) {
          infos.push({ type: "tool", text: toolText })
        }
        activeStageIndex = null
      } else if (part.type === "stage-info") {
        const key = `${part.stage}|${part.message}`;
        if (!seenStage.has(key)) {
          seenStage.add(key);
          const nextInfo: DisplayInfo = { type: "stage", stage: part.stage, text: part.message, details: [] }
          const nextInfoIndex = infos.length;
          infos.push(nextInfo);
          stageIndexByKey.set(key, nextInfoIndex);
          activeStageIndex = nextInfoIndex;
        } else {
          activeStageIndex = stageIndexByKey.get(key) ?? null;
        }
      } else if (part.type === "node-start") {
        infos.push({ type: "node-tracking", node: part.node });
        activeStageIndex = null;
      } else if (part.type === "error") {
        infos.push({ type: "error", message: part.message });
        activeStageIndex = null;
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
            seenStage.add(key)
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

  const getDisplayText = (message: AgentMessage): DisplayInfo[] => {
    if (message.role === "user") {
      const text = getMessageText(message) || "(empty user message)"
      return [{ type: "text", text }]
    }
    return getAssistantInfos(message)
  }

  const getPreviewPayload = (
    message: AgentMessage,
  ): StagePreviewPayload | null => {
    if (isStreaming) return null
    if (message.role !== "assistant") return null
    const payload = getShowResponsePayload(message) as { topic?: string } | undefined
    const topic = payload?.topic?.trim()
    if (!topic) return null

    const { uiTree, styles, interactions, pages } = extractStructureAndStyleFromParts(message)
    if (uiTree === null) return null

    return { topic, uiTree, styles, interactions, pages }
  }

  // Derive timeline rounds during render. Timestamp cache is stored in state
  // and is only updated in effects.
  const timelineRounds = (() => {
    type PendingUser = { text: string }
    const rounds: TimelineRoundItem[] = []
    const pendingUsers: PendingUser[] = []

    for (let index = 0; index < normalizedMessages.length; index++) {
      const message = normalizedMessages[index]
      const messageTargetId = `studio-msg-${message.id}-${index}`

      if (message.role === "user") {
        const text = getMessageText(message) || "(empty user message)"
        pendingUsers.push({ text })
        continue
      }

      if (message.role !== "assistant") continue

      const displayInfos = getAssistantInfos(message)
      const previewPayload = (() => {
        if (isStreaming) return null
        if (message.role !== "assistant") return null
        const payload = getShowResponsePayload(message) as { topic?: string } | undefined
        const topic = payload?.topic?.trim()
        if (!topic) return null
        const { uiTree, styles, interactions, pages } = extractStructureAndStyleFromParts(message)
        if (uiTree === null) return null
        return { topic, uiTree, styles, interactions, pages }
      })()
      const assistantPayload = getShowResponsePayload(message) as { topic?: string } | undefined
      const assistantTopic = assistantPayload?.topic?.trim()
      const roundId = `round-${message.id}-${index}`
      const cachedTime = roundTimeMap[roundId]
      const nowIso = cachedTime ?? new Date().toISOString()

      const user = pendingUsers.shift()
      const userText = user?.text || "(no paired user message)"

      const children: TimelineChildItem[] = []
      for (let infoIndex = 0; infoIndex < displayInfos.length; infoIndex++) {
        const info = displayInfos[infoIndex]
        const infoTargetId = `studio-msg-${message.id}-${index}-info-${infoIndex}`
        if (info.type === "stage") {
          children.push({
            id: `${roundId}-stage-${infoIndex}`,
            label: `[${info.stage}] ${info.text}`,
            targetId: infoTargetId,
            type: "stage",
          })
        } else if (info.type === "tool") {
          children.push({
            id: `${roundId}-tool-${infoIndex}`,
            label: info.text,
            targetId: infoTargetId,
            type: "tool",
          })
        } else if (info.type === "text") {
          children.push({
            id: `${roundId}-text-${infoIndex}`,
            label: info.text,
            targetId: infoTargetId,
            type: "text",
          })
        } else if (info.type === "node-tracking") {
          children.push({
            id: `${roundId}-node-${infoIndex}`,
            label: `Node: ${info.node}`,
            targetId: infoTargetId,
            type: "node-tracking",
          })
        } else if (info.type === "error") {
          children.push({
            id: `${roundId}-error-${infoIndex}`,
            label: `错误: ${info.message.slice(0, 80)}${info.message.length > 80 ? "..." : ""}`,
            targetId: infoTargetId,
            type: "text",
          })
        }
      }

      if (previewPayload) {
        children.push({
          id: `${roundId}-preview`,
          label: `预览：${previewPayload.topic}`,
          targetId: `studio-msg-${message.id}-${index}-preview`,
          type: "preview",
        })
      }

      const assistantTitle = assistantTopic || children[0]?.label || "assistant"
      rounds.push({
        id: roundId,
        timestamp: nowIso,
        assistantTargetId: messageTargetId,
        userText,
        assistantTitle,
        children,
      })
    }

    return rounds
  })()

  useEffect(() => {
    dispatchEvent<TimelineRoundItem[]>("studioTimelineUpdate", timelineRounds)
  }, [timelineRounds])

  useEffect(() => {
    const handleScrollTo: EventListener = (event) => {
      const customEvent = event as CustomEvent<{ targetId?: string }>
      const targetId = customEvent.detail?.targetId
      if (!targetId) return
      const target = document.getElementById(targetId)
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
    window.addEventListener("studioTimelineScrollTo", handleScrollTo)
    return () => {
      window.removeEventListener("studioTimelineScrollTo", handleScrollTo)
      dispatchEvent<TimelineRoundItem[]>("studioTimelineUpdate", [])
    }
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const scrollViewport = container.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null
    if (!scrollViewport) return

    let rafId = 0
    const syncActiveAssistant = () => {
      const assistantNodes = Array.from(
        container.querySelectorAll<HTMLElement>('[data-message-role="assistant"]'),
      )
      if (assistantNodes.length === 0) {
        dispatchEvent("studioTimelineActiveChange", { assistantTargetId: "" })
        return
      }

      const scrollTop = scrollViewport.scrollTop
      let activeNode = assistantNodes[0]
      for (const node of assistantNodes) {
        if (node.offsetTop - scrollTop <= 40) {
          activeNode = node
        } else {
          break
        }
      }
      dispatchEvent("studioTimelineActiveChange", { assistantTargetId: activeNode.id })
    }

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(syncActiveAssistant)
    }

    syncActiveAssistant()
    scrollViewport.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      scrollViewport.removeEventListener("scroll", handleScroll)
      dispatchEvent("studioTimelineActiveChange", { assistantTargetId: "" })
    }
  }, [normalizedMessages])

  return (
    <div className="h-full min-h-0 p-4 md:p-6 flex flex-col overflow-hidden">
      <Card className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <CardHeader className="shrink-0">
          <CardTitle>{topic}</CardTitle>
          <CardDescription>输入需求并实时接收 Agent 流式输出。</CardDescription>
        </CardHeader>

        {!apiKeyConfigured && (
          <div className="mx-4 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-amber-800 dark:text-amber-200">
              尚未配置 API Key，请前往设置页面配置模型厂商和 API Key 后方可使用。
            </span>
            <Link href="/studio/settings">
              <Button variant="outline" size="sm" className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900">
                前往设置
              </Button>
            </Link>
          </div>
        )}

        <CardContent className="flex-1 min-h-0 p-4 pt-0 overflow-hidden">
          {errorMessage && (
            <div className="mb-2 rounded-md border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950 px-4 py-2 text-sm text-red-800 dark:text-red-200">
              {errorMessage}
            </div>
          )}
          <div ref={messagesContainerRef} className="h-full min-h-0 rounded-md border bg-muted/20 overflow-hidden">
            <ScrollArea className="h-full min-h-0 overscroll-contain">
              <div className="space-y-3 p-3">
                {normalizedMessages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    还没有消息，输入内容后点击 Send 开始对话。
                  </div>
                ) : (
                  normalizedMessages.map((message, index) => {
                    const isUser = message.role === "user"
                    const displayInfos = getDisplayText(message)
                    const previewPayload = getPreviewPayload(message)

                    return (
                      <div
                        key={`${message.id}-${index}`}
                        id={`studio-msg-${message.id}-${index}`}
                        data-message-role={message.role}
                        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div className="max-w-[80%] space-y-2">
                          {displayInfos.map((info, idx) => {
                            if (info.type === "stage") {
                              const stageKey = `${info.stage}|${info.text}`;
                              const isActiveStage = stageKey === activeStageKey && stageElapsed > 0 && isStreaming;
                              return (
                                <div
                                  key={`${message.id}-info-${idx}`}
                                  id={`studio-msg-${message.id}-${index}-info-${idx}`}
                                  className="px-3 py-1 text-xs text-muted-foreground/60 italic flex items-center gap-1.5"
                                >
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  {getStageLabel(info.stage)}
                                  {isActiveStage && (
                                    <span className="text-muted-foreground/40">· {stageElapsed}s</span>
                                  )}
                                </div>
                              )
                            }

                            if (info.type === "node-tracking") {
                              return (
                                <div
                                  key={`${message.id}-node-${idx}`}
                                  id={`studio-msg-${message.id}-${index}-info-${idx}`}
                                  className="px-3 py-1 text-xs text-blue-500/60 italic flex items-center gap-1"
                                >
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  Node: {info.node}
                                </div>
                              )
                            }

                            if (info.type === "error") {
                              return (
                                <div
                                  key={`${message.id}-error-${idx}`}
                                  id={`studio-msg-${message.id}-${index}-info-${idx}`}
                                  className="rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950 px-3 py-2 text-sm text-red-800 dark:text-red-200"
                                >
                                  {info.message}
                                </div>
                              )
                            }

                            if (info.text) {
                              return (
                                <div
                                  key={`${message.id}-info-${idx}`}
                                  id={`studio-msg-${message.id}-${index}-info-${idx}`}
                                  className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${isUser
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
                              id={`studio-msg-${message.id}-${index}-preview`}
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
                {isStreaming && currentTask?.status === "submitted" && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 text-sm text-muted-foreground/70 italic flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      正在连接...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="shrink-0 flex-col gap-2 p-4 pt-0">
          <form onSubmit={handleSubmit} className="w-full flex items-end gap-2">
            <textarea
              id="prompt-input"
              name="prompt"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="例如：生成一个电商后台仪表盘，包含图表、筛选和表格"
              className="min-h-24 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />

            {isStreaming ? (
              <Button type="button" variant="outline" onClick={handleStop}>
                停止
              </Button>
            ) : (
              <Button type="submit" disabled={!canSend}>
                发送
              </Button>
            )}
          </form>
          <span className="text-xs text-muted-foreground">Enter 发送，Shift+Enter 换行</span>
        </CardFooter>
      </Card>
    </div>
  )
}
