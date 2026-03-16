import * as React from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

/** Alert4u 组件参数：支持默认结构与自定义 children 两种渲染方式。 */
export interface Alert4uProps {
  className?: string
  rootClassName?: string
  children?: React.ReactNode
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  alertProps?: React.ComponentProps<typeof Alert>
  titleProps?: React.ComponentProps<typeof AlertTitle>
  descriptionProps?: React.ComponentProps<typeof AlertDescription>
}

export function Alert4u({
  className,
  rootClassName,
  children,
  icon,
  title = "Heads up!",
  description = "You can add components and dependencies using the cli.",
  alertProps,
  titleProps,
  descriptionProps,
}: Alert4uProps) {
  return (
    <Alert {...alertProps} className={cn(className, rootClassName, alertProps?.className)}>
      {children ?? (
        <>
          {icon}
          <AlertTitle {...titleProps}>{title}</AlertTitle>
          <AlertDescription {...descriptionProps}>{description}</AlertDescription>
        </>
      )}
    </Alert>
  )
}
