import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Label4u 组件参数：支持默认文本、必填标识与 props 透传。 */
export interface Label4uProps {
  rootClassName?: string
  children?: React.ReactNode
  text?: React.ReactNode
  required?: boolean
  requiredMark?: React.ReactNode
  labelProps?: React.ComponentProps<typeof Label>
}

export function Label4u({
  rootClassName,
  children,
  text = "Label",
  required = false,
  requiredMark = "*",
  labelProps,
}: Label4uProps) {
  return (
    <Label {...labelProps} className={cn(rootClassName, labelProps?.className)}>
      {children ?? (
        <>
          {text}
          {required && <span className="text-destructive">{requiredMark}</span>}
        </>
      )}
    </Label>
  )
}
