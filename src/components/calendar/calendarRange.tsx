"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import type { CalendarRangeProps } from "@/components/calendar/calendarClassifier"
import type { DateRange } from "react-day-picker"

export function CalendarRange(props: CalendarRangeProps) {
  const {
    selected,
    onSelect,
    ...calendarProps
  } = props

  const [innerRange, setInnerRange] = React.useState<DateRange | undefined>()

  return (
    <Calendar
      {...calendarProps}
      mode="range"
      selected={selected ?? innerRange}
      onSelect={onSelect ?? setInnerRange}
    />
  )
}
