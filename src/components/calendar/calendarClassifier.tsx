import type * as React from "react"
import type { Button } from "@/components/ui/button"
import type { DayPicker, PropsMulti, PropsRange, PropsSingle } from "react-day-picker"
import { CalendarSingle } from "@/components/calendar/calendarSingle"
import { CalendarRange } from "@/components/calendar/calendarRange"
import { CalendarMultiple } from "@/components/calendar/calendarMultiple"

/**
 * 各个 `mode` 下都会影响展示形式的通用参数。
 */
interface CalendarCommonProps {
  className?: string
  classNames?: React.ComponentProps<typeof DayPicker>["classNames"]
  showOutsideDays?: boolean
  captionLayout?: React.ComponentProps<typeof DayPicker>["captionLayout"]
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  formatters?: React.ComponentProps<typeof DayPicker>["formatters"]
  components?: React.ComponentProps<typeof DayPicker>["components"]
}

type CalendarCommonPropKeys = keyof CalendarCommonProps | "mode"

/** `single` 模式参数：通用展示参数 + DayPicker 单选能力。 */
export interface CalendarSingleProps
  extends CalendarCommonProps,
  Omit<PropsSingle, CalendarCommonPropKeys> { }

/** `range` 模式参数：通用展示参数 + DayPicker 区间能力。 */
export interface CalendarRangeProps
  extends CalendarCommonProps,
  Omit<PropsRange, CalendarCommonPropKeys> { }

/** `multiple` 模式参数：通用展示参数 + DayPicker 多选能力。 */
export interface CalendarMultipleProps
  extends CalendarCommonProps,
  Omit<PropsMulti, CalendarCommonPropKeys> { }

type CalendarClassifierProps =
  | ({ mode: "single" } & CalendarSingleProps)
  | ({ mode: "range" } & CalendarRangeProps)
  | ({ mode: "multiple" } & CalendarMultipleProps)

export default function CalendarClassifier(props: CalendarClassifierProps) {
  switch (props.mode) {
    case "single":
      return <CalendarSingle {...props} />
    case "range":
      return <CalendarRange {...props} />
    case "multiple":
      return <CalendarMultiple {...props} />
    default:
      return null
  }
}