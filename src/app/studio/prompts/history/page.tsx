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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function HistoryPage() {
  const details = React.useContext(ChatDetailsContext)

  const handleDelete = React.useCallback(async (id: string) => {
    try {
      await DBManager.execute({ operationType: "delete", id })
      // 通知父组件更新左侧列表
      window.dispatchEvent(new CustomEvent("deleteConversation", { detail: { id } }))
    } catch (error) {
      console.error(error)
    }
  }, [])

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>历史记录</CardTitle>
          <CardDescription>管理你生成过的对话主题</CardDescription>
        </CardHeader>
        <CardContent>
          {details.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
              暂无历史记录
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      <Link
                        href={`/studio/prompts/?id=${detail.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {detail.topic}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {new Date(detail.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="xs">
                            删除
                          </Button>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}