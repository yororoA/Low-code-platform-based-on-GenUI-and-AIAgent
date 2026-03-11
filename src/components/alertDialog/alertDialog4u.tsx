import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

/** AlertDialog4u 组件参数：支持默认结构与自定义 children 两种渲染方式。 */
export interface AlertDialog4uProps {
  trigger?: React.ReactNode
  triggerText?: React.ReactNode
  media?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  cancelText?: React.ReactNode
  actionText?: React.ReactNode
  children?: React.ReactNode
  dialogProps?: React.ComponentProps<typeof AlertDialog>
  triggerProps?: Omit<React.ComponentProps<typeof AlertDialogTrigger>, "children">
  contentProps?: Omit<React.ComponentProps<typeof AlertDialogContent>, "children">
  headerProps?: React.ComponentProps<typeof AlertDialogHeader>
  mediaProps?: React.ComponentProps<typeof AlertDialogMedia>
  titleProps?: React.ComponentProps<typeof AlertDialogTitle>
  descriptionProps?: React.ComponentProps<typeof AlertDialogDescription>
  footerProps?: React.ComponentProps<typeof AlertDialogFooter>
  cancelProps?: Omit<React.ComponentProps<typeof AlertDialogCancel>, "children">
  actionProps?: Omit<React.ComponentProps<typeof AlertDialogAction>, "children">
}

export function AlertDialog4u({
  trigger,
  triggerText = "Open",
  media,
  title = "Are you absolutely sure?",
  description = "This action cannot be undone. This will permanently affect your data.",
  cancelText = "Cancel",
  actionText = "Continue",
  children,
  dialogProps,
  triggerProps,
  contentProps,
  headerProps,
  mediaProps,
  titleProps,
  descriptionProps,
  footerProps,
  cancelProps,
  actionProps,
}: AlertDialog4uProps) {
  const defaultTrigger = <Button variant="outline">{triggerText}</Button>

  return (
    <AlertDialog {...dialogProps}>
      <AlertDialogTrigger {...triggerProps} asChild={triggerProps?.asChild ?? true}>
        {trigger ?? defaultTrigger}
      </AlertDialogTrigger>

      <AlertDialogContent {...contentProps}>
        {children ?? (
          <>
            <AlertDialogHeader {...headerProps}>
              {media && <AlertDialogMedia {...mediaProps}>{media}</AlertDialogMedia>}
              <AlertDialogTitle {...titleProps}>{title}</AlertDialogTitle>
              <AlertDialogDescription {...descriptionProps}>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter {...footerProps}>
              <AlertDialogCancel {...cancelProps}>{cancelText}</AlertDialogCancel>
              <AlertDialogAction {...actionProps}>{actionText}</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
