'use client'
import { useEffect, type ReactNode, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { DBManager } from "@/lib/dbtest"
import { cn } from "@/lib/utils"

export default function StudioLayout({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<{ id: string, topic: string }[]>([]);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedPromptId = searchParams.get("id");
  const selectedPrompt = details.find((item) => item.id === selectedPromptId);
  const isHomeSelected = pathname === "/studio";
  const isPromptSectionSelected = pathname?.startsWith("/studio/prompts");

  useEffect(() => {
    let isCanceled = false;
    (async () => {
      // 连接数据库并初始化历史列表
      await DBManager.execute({ operationType: 'open' });
      if (isCanceled) await DBManager.execute({ operationType: 'close' });
      else {
        const allTopix = await DBManager.execute({ operationType: 'getSummary', indexName: 'topicIndex' });
        setDetails(allTopix as { id: string, topic: string }[]);
      }
    })();
    return () => {
      isCanceled = true;
      (async () => {
        await DBManager.execute({ operationType: 'close' });
      })();
    }
  }, [setDetails]);


  return (
    <div className="min-h-dvh w-full bg-background">
      <div className="h-14 border-b flex items-center px-4">
        <div className="font-semibold">GenUI + Agent Studio</div>
        <div className="ml-auto flex gap-2">{/* actions */}</div>
      </div>

      <div className="grid h-[calc(100dvh-56px)] grid-cols-1 lg:grid-cols-[240px_1fr_300px]">
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
                  {details.map(({ id, topic }) => (
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
        <main className="flex-1 min-w-0 h-full overflow-hidden">
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </main>
        <aside className="hidden border-l p-3 lg:block overflow-y-auto">
          <div className="text-sm text-muted-foreground">Inspector</div>
        </aside>
      </div>
    </div>
  )
}