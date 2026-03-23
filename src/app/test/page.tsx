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

import Accordion4u from "@/components/accordion/accordion4u"
import { Alert4u } from "@/components/alert/alert4u"
import { AlertDialog4u } from "@/components/alertDialog/alertDialog4u"
import { Avatar4u } from "@/components/avtar/avatar4u"
import { Button4u } from "@/components/button/button4u"
import { CalendarMultiple } from "@/components/calendar/calendarMultiple"
import { CalendarRange } from "@/components/calendar/calendarRange"
import { CalendarSingle } from "@/components/calendar/calendarSingle"
import { Card4u } from "@/components/card/card4u"
import { Carousel4u } from "@/components/carousel/carousel4u"
import { Chart4u } from "@/components/chart/chart4u"
import { Checkbox4u } from "@/components/checkbox/checkbox"
import { Dropdown4u, type Dropdown4uGroup } from "@/components/dropdown/dropdown4u"
import { Field4u } from "@/components/field/field4u"
import { Label4u } from "@/components/label/label4u"
import { Separator4u } from "@/components/separator/separator4u"
import { Table4u } from "@/components/table/table4u"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ThreeOutputPreviewCard } from "./three-output-preview-card"

const adminOutputMock = {
  text: "好的，老板。我将为您创建一个暖色调、个性化的黄历日历。这个日历会采用温馨的配色方案（如橙色、黄色、米色等），并整合黄历信息（如宜忌事项、吉凶方位等）。我会先设计一个基本的日历界面，然后根据需要添加黄历数据展示。",
  necessary: true,
  uiDescription: "一个暖色调的个性化黄历日历界面，包含日历视图和黄历信息面板。日历部分显示日期，黄历部分展示每日的宜忌事项、吉凶等。",
  uiNeeds: ["CalendarSingle", "Card4u", "Table4u", "Alert4u"],
}

const almanacUiTree = {
  type: "div",
  id: "root",
  props: {
    className: "min-h-screen p-4 md:p-6 flex flex-col md:flex-row gap-6",
  },
  children: [
    {
      type: "Card4u",
      id: "calendar-card",
      props: {
        title: "黄历日历",
        description: "查看每日宜忌吉凶",
        className: "md:w-2/3",
        content: {
          type: "CalendarSingle",
          id: "main-calendar",
          props: {
            className: "w-full",
            captionLayout: "dropdown-months",
            showOutsideDays: true,
          },
        },
      },
    },
    {
      type: "Card4u",
      id: "almanac-panel",
      props: {
        title: "黄历信息",
        description: "今日宜忌事项",
        className: "md:w-1/3",
        content: {
          type: "div",
          id: "almanac-content",
          props: { className: "space-y-4" },
          children: [
            {
              type: "Alert4u",
              id: "auspicious-alert",
              props: {
                title: "宜",
                description: "祭祀、祈福、开市、交易",
              },
            },
            {
              type: "Alert4u",
              id: "inauspicious-alert",
              props: {
                title: "忌",
                description: "嫁娶、动土、安葬",
              },
            },
            {
              type: "Table4u",
              id: "details-table",
              props: {
                captionTitle: "详细吉凶",
                headers: [
                  { description: "事项" },
                  { description: "吉凶" },
                ],
                rows: [
                  {
                    cells: [
                      { content: "财神方位" },
                      { content: "正东" },
                    ],
                  },
                  {
                    cells: [
                      { content: "冲煞" },
                      { content: "冲兔(乙卯)" },
                    ],
                  },
                  {
                    cells: [
                      { content: "吉时" },
                      { content: "巳时、午时" },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    },
  ],
}

const structureOutputMock = {
  uiTree: JSON.stringify(almanacUiTree),
}

const styleOutputMock = {
  temp: "Warm traditional Chinese almanac calendar interface with amber/orange/stone color palette and responsive design",
  styles: [
    {
      id: "root",
      className: "min-h-screen p-4 md:p-6 flex flex-col md:flex-row gap-6 bg-gradient-to-br from-amber-50 to-orange-50",
    },
    {
      id: "calendar-card",
      className: "md:w-2/3 bg-white/90 backdrop-blur-sm border border-amber-200 rounded-xl shadow-lg",
    },
    {
      id: "main-calendar",
      className: "w-full",
      classNames: {
        root: "p-4",
        months: "space-y-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-xl font-semibold text-amber-900",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-amber-700 hover:text-amber-900",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-amber-800 font-medium text-sm w-14 h-9 flex items-center justify-center",
        row: "flex w-full mt-2",
        cell: "h-14 w-14 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-amber-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: "h-14 w-14 p-0 font-normal aria-selected:opacity-100 hover:bg-amber-100 rounded-lg",
        day_selected: "bg-amber-500 text-white hover:bg-amber-500 hover:text-white focus:bg-amber-500 focus:text-white font-semibold",
        day_today: "bg-amber-100 text-amber-900 font-semibold",
        day_outside: "text-amber-400 opacity-50",
        day_disabled: "text-amber-300 opacity-50",
        day_range_middle: "aria-selected:bg-amber-100 aria-selected:text-amber-900",
        day_hidden: "invisible",
      },
    },
    {
      id: "almanac-panel",
      className: "md:w-1/3 bg-white/90 backdrop-blur-sm border border-amber-200 rounded-xl shadow-lg",
    },
    { id: "almanac-content", className: "space-y-4 p-4" },
    {
      id: "auspicious-alert",
      className: "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 text-amber-900 rounded-lg",
    },
    {
      id: "inauspicious-alert",
      className: "bg-gradient-to-r from-stone-50 to-stone-100 border border-stone-300 text-stone-900 rounded-lg",
    },
    {
      id: "details-table",
      className: "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg overflow-hidden",
    },
  ],
}

export default function TestPage() {
  const [showEmail, setShowEmail] = useState(true)
  const [showSms, setShowSms] = useState(false)
  const [position, setPosition] = useState("bottom")
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>()
  const [calendarMultiple, setCalendarMultiple] = useState<Date[] | undefined>()

  const dropdownGroups: Dropdown4uGroup[] = [
    {
      className: "bg-amber-50 rounded-md",
      labelClassName: "text-amber-700",
      label: "Actions",
      items: [
        { type: "item", label: "Profile", icon: <UserIcon />, shortcut: "⌘+P", className: "text-amber-700" },
        { type: "item", label: "Edit", icon: <PencilIcon />, className: "text-blue-700" },
        { type: "item", label: "Share", icon: <ShareIcon />, className: "text-emerald-700" },
      ],
      separator: true,
    },
    {
      className: "bg-cyan-50 rounded-md",
      labelClassName: "text-cyan-700",
      label: "Preferences",
      items: [
        {
          type: "checkbox",
          label: "Email notifications",
          icon: <MailIcon />,
          className: "text-violet-700",
          checked: showEmail,
          onCheckedChange: (checked) => setShowEmail(checked === true),
        },
        {
          type: "checkbox",
          label: "SMS notifications",
          icon: <MessageSquareIcon />,
          className: "text-fuchsia-700",
          checked: showSms,
          onCheckedChange: (checked) => setShowSms(checked === true),
        },
        { type: "separator", className: "bg-orange-300" },
        {
          type: "sub",
          trigger: "More",
          triggerClassName: "text-indigo-700",
          contentClassName: "bg-indigo-50",
          items: [
            {
              type: "radio-group",
              className: "bg-lime-50 rounded-md",
              value: position,
              onValueChange: setPosition,
              items: [
                { value: "top", label: "Top", className: "text-lime-700" },
                { value: "bottom", label: "Bottom", className: "text-sky-700" },
                { value: "right", label: "Right", className: "text-rose-700" },
              ],
            },
            { type: "separator", className: "bg-pink-300" },
            { type: "item", label: "Delete", icon: <TrashIcon />, variant: "destructive", className: "text-red-700" },
          ],
        },
      ],
    },
  ]

  const avatarDropdownGroups: Dropdown4uGroup[] = [
    {
      items: [
        { type: "item", label: "Account", icon: <UserIcon />, className: "text-emerald-700" },
        { type: "item", label: "Billing", icon: <CreditCardIcon />, className: "text-cyan-700" },
        { type: "item", label: "Notifications", icon: <BellIcon />, className: "text-violet-700" },
      ],
      separator: true,
    },
    {
      items: [{ type: "item", label: "Sign Out", icon: <LogOutIcon />, variant: "destructive", className: "text-red-700" }],
    },
  ]

  const chartData = [
    { month: "Jan", desktop: 186, mobile: 80 },
    { month: "Feb", desktop: 305, mobile: 200 },
    { month: "Mar", desktop: 237, mobile: 120 },
    { month: "Apr", desktop: 173, mobile: 190 },
  ]

  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans dark:bg-black">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2">
        <ThreeOutputPreviewCard
          adminOutput={adminOutputMock}
          structureOutput={structureOutputMock}
          styleOutput={styleOutputMock}
          chartData={chartData}
        />

        <Card4u
          className="border-red-300 bg-red-50"
          headerProps={{ className: "bg-red-100" }}
          titleProps={{ className: "text-red-700" }}
          descriptionProps={{ className: "text-red-500" }}
          contentProps={{ className: "bg-red-50" }}
          footerProps={{ className: "bg-red-100" }}
          title="Card4u + 嵌套组件"
          description="通过参数把 Avatar4u 与 Dropdown4u 嵌套到 Card4u 内容区域"
          content={
            <div className="space-y-4">
              <Avatar4u
                className="bg-purple-50 p-3 rounded-md"
                singleAvatars={[
                  {
                    src: "/placeholder-user.jpg",
                    alt: "User",
                    fallback: "U",
                    size: "lg",
                    className: "ring-2 ring-purple-400",
                    imageClassName: "border border-purple-500",
                    fallbackClassName: "bg-purple-200 text-purple-800",
                    hasBadge: true,
                    badge: { icon: <span className="text-[10px] text-white">3</span> },
                  },
                ]}
              />
              <Dropdown4u
                triggerText="Open Menu"
                contentClassName="bg-green-50"
                groupClassName="p-1"
                labelClassName="font-bold"
                itemClassName="bg-green-100"
                checkboxItemClassName="bg-emerald-100"
                radioGroupClassName="bg-cyan-100"
                radioItemClassName="bg-blue-100"
                separatorClassName="bg-yellow-400"
                subTriggerClassName="bg-indigo-100"
                subContentClassName="bg-indigo-50"
                groups={dropdownGroups}
              />
            </div>
          }
          actionLabel="Confirm"
          buttonProps={{ className: "bg-red-200 text-red-900 border-red-400" }}
        />

        <Card4u
          className="border-sky-300 bg-sky-50"
          title="Avatar Trigger Dropdown"
          description="测试 avatar 作为 trigger + align=end"
          content={
            <Dropdown4u
              triggerAsChild
              trigger={
                <Button variant="ghost" size="icon" className="rounded-full bg-sky-100">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </Button>
              }
              contentProps={{ align: "end" }}
              contentClassName="w-48 bg-sky-100"
              groups={avatarDropdownGroups}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-amber-300 bg-amber-50"
          title="Accordion4u"
          content={
            <Accordion4u
              type="single"
              collapsible
              defaultValue="a"
              className="max-w-full bg-amber-100 p-2 rounded-md"
              itemClassName="border-amber-400"
              triggerClassName="text-amber-800"
              contentClassName="text-amber-700 bg-amber-50"
              items={[
                { value: "a", trigger: "Is it accessible?", content: "Yes. It adheres to WAI-ARIA design pattern.", className: "bg-amber-50", triggerClassName: "text-orange-700", contentClassName: "text-orange-600" },
                { value: "b", trigger: "Is it styled?", content: "Yes. It comes with default styles.", className: "bg-yellow-50", triggerClassName: "text-yellow-700", contentClassName: "text-yellow-600" },
              ]}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-pink-300 bg-pink-50"
          title="Carousel4u"
          content={
            <Carousel4u
              className="w-full max-w-sm mx-auto bg-pink-100 rounded-md p-2"
              contentProps={{ className: "-ml-2" }}
              itemProps={{ className: "pl-2" }}
              previousProps={{ className: "bg-pink-200 border-pink-400 text-pink-800" }}
              nextProps={{ className: "bg-fuchsia-200 border-fuchsia-400 text-fuchsia-800" }}
              slides={[
                <div key="slide-1" className="rounded-md border border-pink-500 bg-pink-50 p-8 text-center">Slide 1</div>,
                <div key="slide-2" className="rounded-md border border-fuchsia-500 bg-fuchsia-50 p-8 text-center">Slide 2</div>,
                <div key="slide-3" className="rounded-md border border-rose-500 bg-rose-50 p-8 text-center">Slide 3</div>,
              ]}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-emerald-300 bg-emerald-50"
          title="Checkbox4u"
          content={
            <Checkbox4u
              className="bg-emerald-100 p-3 rounded-md"
              groupClassName="bg-teal-100 p-2 rounded-md"
              legend={{ content: "Display options", description: "Toggle options below." }}
              items={[
                { content: "Status Bar", defaultChecked: true },
                { content: "Activity Bar", disabled: true },
                { content: "Panel", orientation: "horizontal" },
              ]}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-cyan-300 bg-cyan-50"
          title="Table4u"
          content={
            <Table4u
              className="bg-cyan-100 rounded-md"
              captionTitle="A list of recent invoices"
              headers={[
                { description: "Invoice", className: "text-cyan-900" },
                { description: "Status", className: "text-blue-900" },
                { description: "Amount", className: "text-right text-sky-900" },
              ]}
              rows={[
                { className: "bg-cyan-50", cells: [{ content: "INV001", className: "text-cyan-800" }, { content: "Paid", className: "text-emerald-700" }, { content: "$250.00", className: "text-right text-sky-700" }] },
                { className: "bg-blue-50", cells: [{ content: "INV002", className: "text-blue-800" }, { content: "Pending", className: "text-amber-700" }, { content: "$150.00", className: "text-right text-indigo-700" }] },
              ]}
              footer={{ className: "bg-cyan-200", cells: [{ content: "Total", className: "font-medium text-cyan-900" }, { content: "" }, { content: "$400.00", className: "text-right text-cyan-900" }] }}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-violet-300 bg-violet-50"
          title="Chart4u"
          content={
            <Chart4u
              className="bg-violet-100 rounded-md p-2"
              data={chartData}
              xAxisDataKey="month"
              config={{
                desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
                mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
              }}
              series={[
                { type: "bar", dataKey: "desktop" },
                { type: "line", dataKey: "mobile" },
              ]}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-indigo-300 bg-indigo-50"
          title="Button4u"
          content={
            <div className="flex flex-wrap gap-3">
              <Button4u className="bg-indigo-200 text-indigo-900" label="Primary" />
              <Button4u className="bg-purple-200 text-purple-900" buttonProps={{ variant: "outline" }} label="Outline" />
              <Button4u
                className="bg-fuchsia-200 text-fuchsia-900"
                buttonProps={{ variant: "secondary" }}
                leftIcon={<BellIcon className="size-4" />}
                label="Notify"
              />
            </div>
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-lime-300 bg-lime-50"
          title="Label4u + Separator4u"
          content={
            <div className="space-y-3">
              <Label4u className="text-lime-800" text="Project Name" required labelProps={{ htmlFor: "project-name" }} />
              <input
                id="project-name"
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Low-code Studio"
              />
              <Separator4u className="bg-lime-200" separatorProps={{ className: "bg-lime-500" }} />
              <Separator4u
                className="bg-emerald-200 p-2 rounded-sm"
                label="OR"
                labelClassName="text-emerald-800"
                leftSeparatorProps={{ className: "bg-emerald-500" }}
                rightSeparatorProps={{ className: "bg-teal-500" }}
              />
            </div>
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-orange-300 bg-orange-50"
          title="Field4u"
          content={
            <Field4u
              legend="Notification Preferences"
              className="bg-orange-100 p-2 rounded-md"
              setProps={{ className: "bg-amber-100 p-2 rounded-md" }}
              groupProps={{ className: "bg-yellow-100 p-2 rounded-md" }}
              items={[
                {
                  id: "field-email",
                  control: <Checkbox id="field-email" defaultChecked />,
                  label: "Email alerts",
                  description: "Receive weekly activity updates.",
                  fieldProps: { orientation: "horizontal", className: "bg-orange-50 rounded-md p-2" },
                  contentProps: { className: "bg-orange-100 rounded-sm p-1" },
                  labelProps: { className: "text-orange-800" },
                  descriptionProps: { className: "text-orange-600" },
                },
                {
                  id: "field-sms",
                  control: <Checkbox id="field-sms" />,
                  label: "SMS alerts",
                  description: "Only high-priority notifications.",
                  fieldProps: { orientation: "horizontal", className: "bg-amber-50 rounded-md p-2" },
                  contentProps: { className: "bg-amber-100 rounded-sm p-1" },
                  labelProps: { className: "text-amber-800" },
                  descriptionProps: { className: "text-amber-600" },
                },
              ]}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-rose-300 bg-rose-50"
          title="Alert4u"
          content={
            <div className="space-y-3">
              <Alert4u
                className="bg-rose-100 border-rose-300"
                icon={<CircleAlertIcon className="size-4 text-rose-700" />}
                titleProps={{ className: "text-rose-800" }}
                descriptionProps={{ className: "text-rose-600" }}
              />
              <Alert4u
                icon={<CircleAlertIcon className="size-4" />}
                alertProps={{ variant: "destructive" }}
                title="Error"
                description="Your session has expired. Please sign in again."
                titleProps={{ className: "text-red-900" }}
                descriptionProps={{ className: "text-red-800" }}
              />
            </div>
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-slate-300 bg-slate-50"
          title="AlertDialog4u"
          content={
            <AlertDialog4u
              triggerText="Delete Project"
              media={<CircleAlertIcon className="size-8 text-destructive" />}
              title="Delete this project?"
              description="This action cannot be undone and will remove all related resources."
              cancelText="Keep"
              actionText="Delete"
              actionProps={{ variant: "destructive" }}
              contentProps={{ size: "sm" }}
              contentClassName="bg-slate-100 border-slate-300"
              headerProps={{ className: "bg-slate-200 p-2 rounded-md" }}
              titleProps={{ className: "text-slate-900" }}
              descriptionProps={{ className: "text-slate-700" }}
              footerProps={{ className: "bg-slate-200 p-2 rounded-md" }}
              cancelProps={{ className: "bg-slate-300 text-slate-900" }}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-teal-300 bg-teal-50"
          title="CalendarSingle"
          content={<CalendarSingle className="rounded-lg border border-teal-400 bg-teal-100" captionLayout="dropdown-months" />}
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-blue-300 bg-blue-50"
          title="CalendarRange"
          content={
            <CalendarRange
              className="rounded-lg border border-blue-400 bg-blue-100"
              captionLayout="dropdown"
              selected={calendarRange}
              onSelect={setCalendarRange}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          className="border-fuchsia-300 bg-fuchsia-50"
          title="CalendarMultiple"
          content={
            <CalendarMultiple
              className="rounded-lg border border-fuchsia-400 bg-fuchsia-100"
              captionLayout="dropdown"
              selected={calendarMultiple}
              onSelect={setCalendarMultiple}
            />
          }
          showDefaultFooterButton={false}
        />
      </div>
    </div>
  )
}