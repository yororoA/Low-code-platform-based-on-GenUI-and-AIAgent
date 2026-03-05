"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import type { CalendarSingleProps } from "@/components/calendar/calendarClassifier"

export function CalendarSingle(props:CalendarSingleProps) {
  const {
    selected,
    onSelect,
    ...calendarProps
  } = props

  const [innerDate, setInnerDate] = React.useState<Date | undefined>(new Date())

  return (
    <Calendar
      {...calendarProps}
      mode="single"
      selected={selected ?? innerDate}
      onSelect={onSelect ?? setInnerDate}
    />
  )
}
