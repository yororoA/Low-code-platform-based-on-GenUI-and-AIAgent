"use client"

import * as React from "react"
import Link from "next/link"

import { ChatDetailsContext } from "@/contexts"
import { DBManager } from "@/lib/dbtest"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MoreVerticalIcon,
  TrashIcon,
  ExternalLinkIcon,
  CalendarIcon,
  MessageSquareIcon,
  EditIcon,
} from "lucide-react"

export default function HistoryPage() {
  const details = React.useContext(ChatDetailsContext)

  const handleDelete = React.useCallback(async (id: string) => {
    try {
      await DBManager.execute({ operationType: "delete", id })
      window.dispatchEvent(new CustomEvent("deleteConversation", { detail: { id } }))
    } catch (error) {
      console.error(error)
    }
  }, [])

  const formatDate = (timestamp: Date) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays} 天前`
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <ScrollArea className="h-full [&>div[data-slot=scroll-area-viewport]>div]:[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">历史记录</h1>
          <p className="text-muted-foreground">管理你生成过的对话主题</p>
        </div>

        {details.length === 0 ? (
          <Empty className="min-h-[400px] border rounded-lg">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageSquareIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>暂无历史记录</EmptyTitle>
              <EmptyDescription>
                开始一个新的对话后，你的历史记录会显示在这里。
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/studio/prompts">
                  开始新对话
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4">
            {details.map((detail) => (
              <Card 
                key={detail.id} 
                className="group hover:shadow-md transition-all duration-200 hover:border-primary/30"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/studio/prompts/?id=${detail.id}`}
                          className="font-semibold text-lg text-foreground hover:text-primary transition-colors truncate"
                        >
                          {detail.topic}
                        </Link>
                        <Badge variant="secondary" className="shrink-0">
                          {formatDate(detail.timestamp)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{new Date(detail.timestamp).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquareIcon className="w-4 h-4" />
                          <span>查看详情</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/studio/prompts/?id=${detail.id}`}>
                              <ExternalLinkIcon className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>打开对话</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVerticalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/studio/prompts/?id=${detail.id}`} className="flex items-center">
                              <EditIcon className="mr-2 h-4 w-4" />
                              继续对话
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive flex items-center"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <TrashIcon className="mr-2 h-4 w-4" />
                                删除记录
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent size="sm">
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除该记录？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  删除后将从历史列表中移除，且无法撤销。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(detail.id)}>
                                  确认删除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}