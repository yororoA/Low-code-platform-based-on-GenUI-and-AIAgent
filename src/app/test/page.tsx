"use client"

import { useState } from "react"
import type { DateRange } from "react-day-picker"
import {
  BellIcon,
  CircleAlertIcon,
  CreditCardIcon,
  LogOutIcon,
  MailIcon,
  MessageSquareIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react"
import {
  socialFeedAdminOutputMock,
  socialFeedStructureOutputMock,
  socialFeedStyleOutputMock,
} from "./socialFeedMock"

import { ThreeOutputPreviewCard } from "../../lib/renderByAST"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, RechartsPrimitive } from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const adminOutputMock = {
  text: "好的，老板。我将为您创建一个现代、清晰的日历界面，包含当前月份日历视图和日程安排列表。",
  necessary: true,
  uiDescription: "一个现代、清晰的日历界面，包含当前月份日历视图和日程安排列表。日历部分显示网格布局，突出显示今天。日程安排列表显示时间、标题和描述。",
  uiNeeds: ["Card", "Badge"],
}

const almanacUiTree = {"type": "div", "id": "calendar-container", "props": {"className": "flex flex-col gap-6 p-4 max-w-4xl mx-auto"}, "children": [{"type": "Card", "id": "calendar-card", "props": {"className": "w-full shadow-sm border"}, "children": [{"type": "CardHeader", "id": "calendar-header", "props": {"className": "flex flex-row items-center justify-between p-4"}, "children": [{"type": "CardTitle", "id": "calendar-title", "props": {"className": "text-xl font-semibold"}, "children": [{"type": "text", "id": "calendar-title-text", "props": {"content": "当前月份日历"}}]}, {"type": "Badge", "id": "today-badge", "props": {"variant": "default", "className": "ml-2"}, "children": [{"type": "text", "id": "today-badge-text", "props": {"content": "今天"}}]}]}, {"type": "CardContent", "id": "calendar-content", "props": {"className": "p-4 pt-0"}, "children": [{"type": "div", "id": "calendar-grid", "props": {"className": "grid grid-cols-7 gap-2"}, "children": [{"type": "div", "id": "weekday-header-0", "props": {"className": "text-center font-medium text-sm"}, "children": [{"type": "text", "id": "weekday-text-0", "props": {"content": "日"}}]}, {"type": "div", "id": "weekday-header-1", "props": {"className": "text-center font-medium text-sm"}, "children": [{"type": "text", "id": "weekday-text-1", "props": {"content": "一"}}]}, {"type": "div", "id": "weekday-header-2", "props": {"className": "text-center font-medium text-sm"}, "children": [{"type": "text", "id": "weekday-text-2", "props": {"content": "二"}}]}, {"type": "div", "id": "weekday-header-3", "props": {"className": "text-center font-medium text-sm"}, "children": [{"type": "text", "id": "weekday-text-3", "props": {"content": "三"}}]}, {"type": "div", "id": "weekday-header-4", "props": {"className": "text-center font-medium text-sm"}, "children": [{"type": "text", "id": "weekday-text-4", "props": {"content": "四"}}]}, {"type": "div", "id": "weekday-header-5", "props": {"className": "text-center font-medium text-sm"}, "children": [{"type": "text", "id": "weekday-text-5", "props": {"content": "五"}}]}, {"type": "div", "id": "weekday-header-6", "props": {"className": "text-center font-medium text-sm"}, "children": [{"type": "text", "id": "weekday-text-6", "props": {"content": "六"}}]}, {"type": "div", "id": "calendar-day-1", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-1", "props": {"content": "1"}}]}, {"type": "div", "id": "calendar-day-2", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-2", "props": {"content": "2"}}]}, {"type": "div", "id": "calendar-day-3", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-3", "props": {"content": "3"}}]}, {"type": "div", "id": "calendar-day-4", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-4", "props": {"content": "4"}}]}, {"type": "div", "id": "calendar-day-5", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-5", "props": {"content": "5"}}]}, {"type": "div", "id": "calendar-day-6", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-6", "props": {"content": "6"}}]}, {"type": "div", "id": "calendar-day-7", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-7", "props": {"content": "7"}}]}, {"type": "div", "id": "calendar-day-8", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-8", "props": {"content": "8"}}]}, {"type": "div", "id": "calendar-day-9", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-9", "props": {"content": "9"}}]}, {"type": "div", "id": "calendar-day-10", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-10", "props": {"content": "10"}}]}, {"type": "div", "id": "calendar-day-11", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-11", "props": {"content": "11"}}]}, {"type": "div", "id": "calendar-day-12", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-12", "props": {"content": "12"}}]}, {"type": "div", "id": "calendar-day-13", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-13", "props": {"content": "13"}}]}, {"type": "div", "id": "calendar-day-14", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-14", "props": {"content": "14"}}]}, {"type": "div", "id": "calendar-day-15", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-15", "props": {"content": "15"}}]}, {"type": "div", "id": "calendar-day-16", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-16", "props": {"content": "16"}}]}, {"type": "div", "id": "calendar-day-17", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-17", "props": {"content": "17"}}]}, {"type": "div", "id": "calendar-day-18", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-18", "props": {"content": "18"}}]}, {"type": "div", "id": "calendar-day-19", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-19", "props": {"content": "19"}}]}, {"type": "div", "id": "calendar-day-20", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-20", "props": {"content": "20"}}]}, {"type": "div", "id": "calendar-day-21", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-21", "props": {"content": "21"}}]}, {"type": "div", "id": "calendar-day-22", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-22", "props": {"content": "22"}}]}, {"type": "div", "id": "calendar-day-23", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-23", "props": {"content": "23"}}]}, {"type": "div", "id": "calendar-day-24", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-24", "props": {"content": "24"}}]}, {"type": "div", "id": "calendar-day-25", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-25", "props": {"content": "25"}}]}, {"type": "div", "id": "calendar-day-26", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-26", "props": {"content": "26"}}]}, {"type": "div", "id": "calendar-day-27", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-27", "props": {"content": "27"}}]}, {"type": "div", "id": "calendar-day-28", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-28", "props": {"content": "28"}}]}, {"type": "div", "id": "calendar-day-29", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-29", "props": {"content": "29"}}]}, {"type": "div", "id": "calendar-day-30", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-30", "props": {"content": "30"}}]}, {"type": "div", "id": "calendar-day-31", "props": {"className": "text-center p-2 rounded-md"}, "children": [{"type": "text", "id": "day-text-31", "props": {"content": "31"}}]}]}]}]}, {"type": "Card", "id": "schedule-card", "props": {"className": "w-full shadow-sm border"}, "children": [{"type": "CardHeader", "id": "schedule-header", "props": {"className": "p-4"}, "children": [{"type": "CardTitle", "id": "schedule-title", "props": {"className": "text-xl font-semibold"}, "children": [{"type": "text", "id": "schedule-title-text", "props": {"content": "最近的日程安排"}}]}]}, {"type": "CardContent", "id": "schedule-content", "props": {"className": "p-4 pt-0"}, "children": [{"type": "div", "id": "schedule-list", "props": {"className": "flex flex-col gap-3"}, "children": [{"type": "div", "id": "schedule-item-1", "props": {"className": "flex flex-row items-center gap-3 p-3 rounded-md"}, "children": [{"type": "Badge", "id": "schedule-badge-1", "props": {"variant": "secondary", "className": ""}, "children": [{"type": "text", "id": "schedule-badge-text-1", "props": {"content": "10:00"}}]}, {"type": "div", "id": "schedule-details-1", "props": {"className": "flex flex-col"}, "children": [{"type": "text", "id": "schedule-title-1", "props": {"content": "团队会议"}}, {"type": "text", "id": "schedule-description-1", "props": {"content": "讨论项目进度"}}]}]}, {"type": "div", "id": "schedule-item-2", "props": {"className": "flex flex-row items-center gap-3 p-3 rounded-md"}, "children": [{"type": "Badge", "id": "schedule-badge-2", "props": {"variant": "secondary", "className": ""}, "children": [{"type": "text", "id": "schedule-badge-text-2", "props": {"content": "14:30"}}]}, {"type": "div", "id": "schedule-details-2", "props": {"className": "flex flex-col"}, "children": [{"type": "text", "id": "schedule-title-2", "props": {"content": "客户演示"}}, {"type": "text", "id": "schedule-description-2", "props": {"content": "展示新功能"}}]}]}, {"type": "div", "id": "schedule-item-3", "props": {"className": "flex flex-row items-center gap-3 p-3 rounded-md"}, "children": [{"type": "Badge", "id": "schedule-badge-3", "props": {"variant": "secondary", "className": ""}, "children": [{"type": "text", "id": "schedule-badge-text-3", "props": {"content": "16:00"}}]}, {"type": "div", "id": "schedule-details-3", "props": {"className": "flex flex-col"}, "children": [{"type": "text", "id": "schedule-title-3", "props": {"content": "健身"}}, {"type": "text", "id": "schedule-description-3", "props": {"content": "健身房锻炼"}}]}]}]}]}]}]}

const structureOutputMock = {
  uiTree: JSON.stringify(almanacUiTree),
}

const styleOutputMock = {
    "temp": "Calendar and schedule interface with modern styling using warm amber/orange/stone color palette. Today's date (day 15) highlighted with amber background, weekday headers in stone-700, schedule items with hover effects.",
    "styles": [
        {
            "id": "calendar-container",
            "className": "flex flex-col gap-6 p-4 max-w-4xl mx-auto bg-stone-50"
        },
        {
            "id": "calendar-card",
            "className": "w-full shadow-md border border-stone-200 rounded-xl bg-white"
        },
        {
            "id": "calendar-header",
            "className": "flex flex-row items-center justify-between p-4 border-b border-stone-100"
        },
        {
            "id": "calendar-title",
            "className": "text-xl font-semibold text-stone-800"
        },
        {
            "id": "today-badge",
            "className": "ml-2 bg-amber-500 text-white hover:bg-amber-600"
        },
        {
            "id": "calendar-content",
            "className": "p-4 pt-0"
        },
        {
            "id": "calendar-grid",
            "className": "grid grid-cols-7 gap-2"
        },
        {
            "id": "weekday-header-0",
            "className": "text-center font-medium text-sm text-stone-700 py-2"
        },
        {
            "id": "weekday-header-1",
            "className": "text-center font-medium text-sm text-stone-700 py-2"
        },
        {
            "id": "weekday-header-2",
            "className": "text-center font-medium text-sm text-stone-700 py-2"
        },
        {
            "id": "weekday-header-3",
            "className": "text-center font-medium text-sm text-stone-700 py-2"
        },
        {
            "id": "weekday-header-4",
            "className": "text-center font-medium text-sm text-stone-700 py-2"
        },
        {
            "id": "weekday-header-5",
            "className": "text-center font-medium text-sm text-stone-700 py-2"
        },
        {
            "id": "weekday-header-6",
            "className": "text-center font-medium text-sm text-stone-700 py-2"
        },
        {
            "id": "calendar-day-1",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-2",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-3",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-4",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-5",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-6",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-7",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-8",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-9",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-10",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-11",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-12",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-13",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-14",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-15",
            "className": "text-center p-2 rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600 cursor-pointer"
        },
        {
            "id": "calendar-day-16",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-17",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-18",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-19",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-20",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-21",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-22",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-23",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-24",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-25",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-26",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-27",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-28",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-29",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-30",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "calendar-day-31",
            "className": "text-center p-2 rounded-md text-stone-700 hover:bg-stone-100 cursor-pointer"
        },
        {
            "id": "schedule-card",
            "className": "w-full shadow-md border border-stone-200 rounded-xl bg-white"
        },
        {
            "id": "schedule-header",
            "className": "p-4 border-b border-stone-100"
        },
        {
            "id": "schedule-title",
            "className": "text-xl font-semibold text-stone-800"
        },
        {
            "id": "schedule-content",
            "className": "p-4 pt-0"
        },
        {
            "id": "schedule-list",
            "className": "flex flex-col gap-3"
        },
        {
            "id": "schedule-item-1",
            "className": "flex flex-row items-center gap-3 p-3 rounded-md border border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors"
        },
        {
            "id": "schedule-badge-1",
            "className": "bg-stone-100 text-stone-800 font-medium px-3 py-1 rounded-full"
        },
        {
            "id": "schedule-details-1",
            "className": "flex flex-col"
        },
        {
            "id": "schedule-title-1",
            "className": "text-stone-800 font-medium"
        },
        {
            "id": "schedule-description-1",
            "className": "text-stone-600 text-sm"
        },
        {
            "id": "schedule-item-2",
            "className": "flex flex-row items-center gap-3 p-3 rounded-md border border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors"
        },
        {
            "id": "schedule-badge-2",
            "className": "bg-stone-100 text-stone-800 font-medium px-3 py-1 rounded-full"
        },
        {
            "id": "schedule-details-2",
            "className": "flex flex-col"
        },
        {
            "id": "schedule-title-2",
            "className": "text-stone-800 font-medium"
        },
        {
            "id": "schedule-description-2",
            "className": "text-stone-600 text-sm"
        },
        {
            "id": "schedule-item-3",
            "className": "flex flex-row items-center gap-3 p-3 rounded-md border border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors"
        },
        {
            "id": "schedule-badge-3",
            "className": "bg-stone-100 text-stone-800 font-medium px-3 py-1 rounded-full"
        },
        {
            "id": "schedule-details-3",
            "className": "flex flex-col"
        },
        {
            "id": "schedule-title-3",
            "className": "text-stone-800 font-medium"
        },
        {
            "id": "schedule-description-3",
            "className": "text-stone-600 text-sm"
        }
    ]
}

const chartData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 173, mobile: 190 },
]

const chartConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
}

export default function TestPage() {
  const [showEmail, setShowEmail] = useState(true)
  const [showSms, setShowSms] = useState(false)
  const [position, setPosition] = useState("bottom")
  const [calendarSingle, setCalendarSingle] = useState<Date | undefined>()
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>()
  const [calendarMultiple, setCalendarMultiple] = useState<Date[] | undefined>()

  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans dark:bg-black">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2">
        <ThreeOutputPreviewCard
          adminOutput={socialFeedAdminOutputMock}
          structureOutput={socialFeedStructureOutputMock}
          styleOutput={socialFeedStyleOutputMock}
        />

        <Card>
          <CardHeader>
            <CardTitle>Dropdown + Avatar</CardTitle>
            <CardDescription>原子组件下拉菜单与头像触发器示例</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <UserIcon /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <PencilIcon /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ShareIcon /> Share
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={showEmail}
                  onCheckedChange={(checked) => setShowEmail(checked === true)}
                >
                  <MailIcon /> Email notifications
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showSms}
                  onCheckedChange={(checked) => setShowSms(checked === true)}
                >
                  <MessageSquareIcon /> SMS notifications
                </DropdownMenuCheckboxItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Position</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
                      <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <TrashIcon /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <CreditCardIcon /> Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BellIcon /> Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <LogOutIcon /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accordion</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>Yes. It adheres to WAI-ARIA design pattern.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>Yes. It comes with default styles.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carousel</CardTitle>
          </CardHeader>
          <CardContent>
            <Carousel className="mx-auto w-full max-w-sm">
              <CarouselContent>
                <CarouselItem>
                  <div className="rounded-md border p-8 text-center">Slide 1</div>
                </CarouselItem>
                <CarouselItem>
                  <div className="rounded-md border p-8 text-center">Slide 2</div>
                </CarouselItem>
                <CarouselItem>
                  <div className="rounded-md border p-8 text-center">Slide 3</div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkbox + Field</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend>Display options</FieldLegend>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox id="status-bar" defaultChecked />
                  <FieldContent>
                    <FieldLabel htmlFor="status-bar">Status Bar</FieldLabel>
                    <FieldDescription>Show editor status bar.</FieldDescription>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox id="activity-bar" disabled />
                  <FieldContent>
                    <FieldLabel htmlFor="activity-bar">Activity Bar</FieldLabel>
                    <FieldDescription>Disabled sample option.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>A list of recent invoices</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>INV001</TableCell>
                  <TableCell>Paid</TableCell>
                  <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>INV002</TableCell>
                  <TableCell>Pending</TableCell>
                  <TableCell className="text-right">$150.00</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell />
                  <TableCell className="text-right">$400.00</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <RechartsPrimitive.ComposedChart data={chartData}>
                <RechartsPrimitive.CartesianGrid vertical={false} />
                <RechartsPrimitive.XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <RechartsPrimitive.Bar dataKey="desktop" fill="var(--color-desktop)" radius={6} />
                <RechartsPrimitive.Line
                  dataKey="mobile"
                  stroke="var(--color-mobile)"
                  strokeWidth={2}
                  dot={false}
                />
              </RechartsPrimitive.ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">
              <BellIcon className="size-4" />
              Notify
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Label + Separator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="project-name">Project Name</Label>
            <input
              id="project-name"
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Low-code Studio"
            />
            <Separator />
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Field Group</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend>Notification Preferences</FieldLegend>
              <FieldGroup>
                <Field orientation="horizontal">
                  <Checkbox id="field-email" defaultChecked />
                  <FieldContent>
                    <FieldLabel htmlFor="field-email">Email alerts</FieldLabel>
                    <FieldDescription>Receive weekly activity updates.</FieldDescription>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal">
                  <Checkbox id="field-sms" />
                  <FieldContent>
                    <FieldLabel htmlFor="field-sms">SMS alerts</FieldLabel>
                    <FieldDescription>Only high-priority notifications.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <CircleAlertIcon />
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>Default alert using atomic components.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Your session has expired. Please sign in again.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Dialog</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Project</Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <CircleAlertIcon className="size-8 text-destructive" />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone and will remove all related resources.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar (Single)</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={calendarSingle}
              onSelect={setCalendarSingle}
              className="rounded-lg border"
              captionLayout="dropdown-months"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar (Range)</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={calendarRange}
              onSelect={setCalendarRange}
              className="rounded-lg border"
              captionLayout="dropdown"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar (Multiple)</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={calendarMultiple}
              onSelect={setCalendarMultiple}
              className="rounded-lg border"
              captionLayout="dropdown"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
