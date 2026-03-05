import type { ReactNode } from "react"
import Link from "next/link"

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh w-full">
      <div className="h-14 border-b flex items-center px-4">
        <div className="font-semibold">GenUI + Agent Studio</div>
        <div className="ml-auto flex gap-2">{/* actions */}</div>
      </div>

      <div className="h-[calc(100dvh-56px)] grid grid-cols-[260px_1fr_320px]">
        <aside className="border-r p-3 flex flex-col gap-2">
          <Link href="/studio">{'Home'}</Link>
          <Link href="/studio/projects">{'Projects'}</Link>
          <Link href="/studio/pages">{'Pages'}</Link>
          <Link href="/studio/workflows">{'Workflows'}</Link>
        </aside>
        <main className="overflow-auto">{children}</main>
        <aside className="border-l p-3">{/* inspector */}</aside>
      </div>
    </div>
  )
}