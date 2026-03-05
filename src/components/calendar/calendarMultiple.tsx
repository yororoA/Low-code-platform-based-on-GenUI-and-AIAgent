"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import type { CalendarMultipleProps } from "@/components/calendar/calendarClassifier"

export function CalendarMultiple(props: CalendarMultipleProps) {
  const {
    selected,
    onSelect,
    ...calendarProps
  } = props

  const [innerDates, setInnerDates] = React.useState<Date[] | undefined>()

  return (
    <Calendar
      {...calendarProps}
      mode="multiple"
      selected={selected ?? innerDates}
      onSelect={onSelect ?? setInnerDates}
    />
  )
}
