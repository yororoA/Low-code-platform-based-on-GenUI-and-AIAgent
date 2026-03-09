import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Card4uProps {
  size?: "default" | "sm"
  rootClassName?: string
  title?: React.ReactNode
  description?: React.ReactNode
  content?: React.ReactNode
  actionLabel?: React.ReactNode
  cardProps?: React.ComponentProps<typeof Card>
  headerProps?: React.ComponentProps<typeof CardHeader>
  titleProps?: React.ComponentProps<typeof CardTitle>
  descriptionProps?: React.ComponentProps<typeof CardDescription>
  contentProps?: React.ComponentProps<typeof CardContent>
  footerProps?: React.ComponentProps<typeof CardFooter>
  buttonProps?: React.ComponentProps<typeof Button>
}

export function Card4u({
  size,
  rootClassName,
  title = "Small Card",
  description = "This card uses the small size variant.",
  content = (
    <p>
      The card component supports a size prop that can be set to
      &quot;sm&quot; for a more compact appearance.
    </p>
  ),
  actionLabel = "Action",
  cardProps,
  headerProps,
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
      <CardHeader {...headerProps}>
        <CardTitle {...titleProps}>{title}</CardTitle>
        <CardDescription {...descriptionProps}>{description}</CardDescription>
      </CardHeader>
      <CardContent {...contentProps}>{content}</CardContent>
      <CardFooter {...footerProps}>
        <Button variant="outline" size="sm" className="w-full" {...buttonProps}>
          {actionLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}