import { useEffect, type ReactNode } from "react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { DBManager } from "@/lib/dbtest"

export default function StudioLayout({ children }: { children: ReactNode }) {

  useEffect(() => {
    let isCanceled = false;
    (async () => {
      // 连接数据库
      await DBManager.execute('open');
      if (isCanceled) await DBManager.execute('close');
    })();
    return () => {
      isCanceled = true;
      (async () => {
        await DBManager.execute('close');
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
          <Link href="/studio">Home</Link>
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