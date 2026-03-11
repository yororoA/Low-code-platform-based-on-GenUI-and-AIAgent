import * as React from "react"

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/** Separator4u 组件参数：支持纯分割线与带文案分割线。 */
export interface Separator4uProps {
  rootClassName?: string
  label?: React.ReactNode
  labelClassName?: string
  separatorProps?: React.ComponentProps<typeof Separator>
  leftSeparatorProps?: React.ComponentProps<typeof Separator>
  rightSeparatorProps?: React.ComponentProps<typeof Separator>
}

export function Separator4u({
  rootClassName,
  label,
  labelClassName,
  separatorProps,
  leftSeparatorProps,
  rightSeparatorProps,
}: Separator4uProps) {
  if (!label) {
    return (
      <Separator
        {...separatorProps}
        className={cn(rootClassName, separatorProps?.className)}
      />
    )
  }

  return (
    <div className={cn("flex items-center gap-2", rootClassName)}>
      <Separator
        {...leftSeparatorProps}
        orientation={leftSeparatorProps?.orientation ?? "horizontal"}
        className={cn("flex-1", leftSeparatorProps?.className)}
      />
      <span className={cn("text-xs text-muted-foreground", labelClassName)}>
        {label}
      </span>
      <Separator
        {...rightSeparatorProps}
        orientation={rightSeparatorProps?.orientation ?? "horizontal"}
        className={cn("flex-1", rightSeparatorProps?.className)}
      />
    </div>
  )
}
