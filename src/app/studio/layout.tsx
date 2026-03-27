'use client'
import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { DBManager } from "@/lib/dbtest"

export default function StudioLayout({ children }: { children: ReactNode }) {

  useEffect(() => {
    let isCanceled = false;
    (async () => {
      // 连接数据库
      await DBManager.execute({ operationType: 'open' });
      if (isCanceled) await DBManager.execute({ operationType: 'close' });
    })();
    return () => {
      isCanceled = true;
      (async () => {
        await DBManager.execute({ operationType: 'close' });
      })();
    }
  }, []);


  return (
    <div className="min-h-dvh w-full bg-background">
      <div className="h-14 border-b flex items-center px-4">
        <div className="font-semibold">GenUI + Agent Studio</div>
        <div className="ml-auto flex gap-2">{/* actions */}</div>
      </div>

      <div className="grid min-h-[calc(100dvh-56px)] grid-cols-1 lg:grid-cols-[240px_1fr_300px]">
        <aside className="border-b p-3 flex flex-col gap-2 lg:border-b-0 lg:border-r">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="home" className="border-b-0">
              <AccordionTrigger className="rounded-md px-2 py-2 text-sm hover:no-underline hover:bg-accent">
                Home
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="flex flex-col gap-1 pl-2">
                  <Link href="/studio" className="rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    Home
                  </Link>
                  <div className="rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                    页面占位 1
                  </div>
                  <div className="rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                    页面占位 2
                  </div>
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
        <main className="overflow-auto">{children}</main>
        <aside className="hidden border-l p-3 lg:block">
          <div className="text-sm text-muted-foreground">Inspector</div>
        </aside>
      </div>
    </div>
  )
}