import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Button4u 组件参数：支持默认文本渲染与 children 自定义内容。 */
export interface Button4uProps {
  rootClassName?: string
  children?: React.ReactNode
  label?: React.ReactNode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  buttonProps?: React.ComponentProps<typeof Button>
}

export function Button4u({
  rootClassName,
  children,
  label = "Button",
  leftIcon,
  rightIcon,
  buttonProps,
}: Button4uProps) {
  return (
    <Button {...buttonProps} className={cn(rootClassName, buttonProps?.className)}>
      {children ?? (
        <>
          {leftIcon}
          {label}
          {rightIcon}
        </>
      )}
    </Button>
  )
}
