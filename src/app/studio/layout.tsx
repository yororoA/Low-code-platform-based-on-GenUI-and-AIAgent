import type { ReactNode } from "react"

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh w-full">
      <div className="h-14 border-b flex items-center px-4">
        <div className="font-semibold">GenUI + Agent Studio</div>
        <div className="ml-auto flex gap-2">{/* actions */}</div>
      </div>

      <div className="h-[calc(100dvh-56px)] grid grid-cols-[260px_1fr_320px]">
        <aside className="border-r p-3">{/* nav */}</aside>
        <main className="overflow-auto">{children}</main>
        <aside className="border-l p-3">{/* inspector */}</aside>
      </div>
    </div>
  )
}