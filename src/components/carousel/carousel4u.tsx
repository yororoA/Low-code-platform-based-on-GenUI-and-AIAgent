import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

/** Carousel4u 组件参数：支持 slide 内容与各子组件透传参数。 */
interface Carousel4uProps {
  className?: string
  rootClassName?: string
  slides?: React.ReactNode[]
  carouselProps?: React.ComponentProps<typeof Carousel>
  contentProps?: React.ComponentProps<typeof CarouselContent>
  itemProps?: React.ComponentProps<typeof CarouselItem>
  previousProps?: React.ComponentProps<typeof CarouselPrevious>
  nextProps?: React.ComponentProps<typeof CarouselNext>
}

export function Carousel4u({
  className,
  rootClassName,
  slides = ["...", "...", "..."],
  carouselProps,
  contentProps,
  itemProps,
  previousProps,
  nextProps,
}: Carousel4uProps) {
  return (
    <Carousel {...carouselProps} className={cn(className, rootClassName, carouselProps?.className)}>
      <CarouselContent {...contentProps}>
        {slides.map((slide, index) => (
          <CarouselItem key={index} {...itemProps}>
            {slide}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious {...previousProps} />
      <CarouselNext {...nextProps} />
    </Carousel>
  )
}