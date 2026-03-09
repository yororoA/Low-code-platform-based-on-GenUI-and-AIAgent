import * as React from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Card4u 组件参数：支持默认结构与自定义 children 两种渲染方式。 */
interface Card4uProps {
  size?: "default" | "sm"
  rootClassName?: string
  children?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  headerAction?: React.ReactNode
  content?: React.ReactNode
  footer?: React.ReactNode
  actionLabel?: React.ReactNode
  showDefaultFooterButton?: boolean
  cardProps?: React.ComponentProps<typeof Card>
  headerProps?: React.ComponentProps<typeof CardHeader>
  actionProps?: React.ComponentProps<typeof CardAction>
  titleProps?: React.ComponentProps<typeof CardTitle>
  descriptionProps?: React.ComponentProps<typeof CardDescription>
  contentProps?: React.ComponentProps<typeof CardContent>
  footerProps?: React.ComponentProps<typeof CardFooter>
  buttonProps?: React.ComponentProps<typeof Button>
}

export function Card4u({
  size,
  rootClassName,
  children,
  title = "Small Card",
  description = "This card uses the small size variant.",
  content = (
    <p>
      The card component supports a size prop that can be set to
      &quot;sm&quot; for a more compact appearance.
    </p>
  ),
  headerAction,
  footer,
  actionLabel = "Action",
  showDefaultFooterButton = true,
  cardProps,
  headerProps,
  actionProps,
  titleProps,
  descriptionProps,
  contentProps,
  footerProps,
  buttonProps,
}: Card4uProps) {
  return (
    <Card
      {...cardProps}
      size={cardProps?.size ?? size}
      className={cn(rootClassName, cardProps?.className)}
    >
      {children ? (
        children
      ) : (
        <>
          <CardHeader {...headerProps}>
            <CardTitle {...titleProps}>{title}</CardTitle>
            <CardDescription {...descriptionProps}>{description}</CardDescription>
            {headerAction && <CardAction {...actionProps}>{headerAction}</CardAction>}
          </CardHeader>
          <CardContent {...contentProps}>{content}</CardContent>
          {(footer || showDefaultFooterButton) && (
            <CardFooter {...footerProps}>
              {footer ?? (
                <Button variant="outline" size="sm" className="w-full" {...buttonProps}>
                  {actionLabel}
                </Button>
              )}
            </CardFooter>
          )}
        </>
      )}
    </Card>
  )
}