"use client"

import { useState } from "react"
import {
  BellIcon,
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
import { Avatar4u } from "@/components/avtar/avatar4u"
import { Card4u } from "@/components/card/card4u"
import { Carousel4u } from "@/components/carousel/carousel4u"
import { Chart4u } from "@/components/chart/chart4u"
import { Checkbox4u } from "@/components/checkbox/checkbox"
import { Dropdown4u, type Dropdown4uGroup } from "@/components/dropdown/dropdown4u"
import { Table4u } from "@/components/table/table4u"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default function TestPage() {
  const [showEmail, setShowEmail] = useState(true)
  const [showSms, setShowSms] = useState(false)
  const [position, setPosition] = useState("bottom")

  const dropdownGroups: Dropdown4uGroup[] = [
    {
      label: "Actions",
      items: [
        { type: "item", label: "Profile", icon: <UserIcon />, shortcut: "⌘+P" },
        { type: "item", label: "Edit", icon: <PencilIcon /> },
        { type: "item", label: "Share", icon: <ShareIcon /> },
      ],
      separator: true,
    },
    {
      label: "Preferences",
      items: [
        {
          type: "checkbox",
          label: "Email notifications",
          icon: <MailIcon />,
          checked: showEmail,
          onCheckedChange: (checked) => setShowEmail(checked === true),
        },
        {
          type: "checkbox",
          label: "SMS notifications",
          icon: <MessageSquareIcon />,
          checked: showSms,
          onCheckedChange: (checked) => setShowSms(checked === true),
        },
        { type: "separator" },
        {
          type: "sub",
          trigger: "More",
          items: [
            {
              type: "radio-group",
              value: position,
              onValueChange: setPosition,
              items: [
                { value: "top", label: "Top" },
                { value: "bottom", label: "Bottom" },
                { value: "right", label: "Right" },
              ],
            },
            { type: "separator" },
            { type: "item", label: "Delete", icon: <TrashIcon />, variant: "destructive" },
          ],
        },
      ],
    },
  ]

  const avatarDropdownGroups: Dropdown4uGroup[] = [
    {
      items: [
        { type: "item", label: "Account", icon: <UserIcon /> },
        { type: "item", label: "Billing", icon: <CreditCardIcon /> },
        { type: "item", label: "Notifications", icon: <BellIcon /> },
      ],
      separator: true,
    },
    {
      items: [{ type: "item", label: "Sign Out", icon: <LogOutIcon />, variant: "destructive" }],
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
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2">
        <Card4u
          title="Card4u + 嵌套组件"
          description="通过参数把 Avatar4u 与 Dropdown4u 嵌套到 Card4u 内容区域"
          content={
            <div className="space-y-4">
              <Avatar4u
                singleAvatars={[
                  {
                    src: "/placeholder-user.jpg",
                    alt: "User",
                    fallback: "U",
                    size: "lg",
                    hasBadge: true,
                    badge: { icon: <span className="text-[10px] text-white">3</span> },
                  },
                ]}
              />
              <Dropdown4u triggerText="Open Menu" groups={dropdownGroups} />
            </div>
          }
          actionLabel="Confirm"
        />

        <Card4u
          title="Avatar Trigger Dropdown"
          description="测试 avatar 作为 trigger + align=end"
          content={
            <Dropdown4u
              triggerAsChild
              trigger={
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                </Button>
              }
              contentProps={{ align: "end" }}
              contentClassName="w-48"
              groups={avatarDropdownGroups}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          title="Accordion4u"
          content={
            <Accordion4u
              type="single"
              collapsible
              defaultValue="a"
              items={[
                { value: "a", trigger: "Is it accessible?", content: "Yes. It adheres to WAI-ARIA design pattern." },
                { value: "b", trigger: "Is it styled?", content: "Yes. It comes with default styles." },
              ]}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          title="Carousel4u"
          content={
            <Carousel4u
              rootClassName="w-full max-w-sm mx-auto"
              slides={[
                <div key="slide-1" className="rounded-md border p-8 text-center">Slide 1</div>,
                <div key="slide-2" className="rounded-md border p-8 text-center">Slide 2</div>,
                <div key="slide-3" className="rounded-md border p-8 text-center">Slide 3</div>,
              ]}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          title="Checkbox4u"
          content={
            <Checkbox4u
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
          title="Table4u"
          content={
            <Table4u
              captionTitle="A list of recent invoices"
              headers={[
                { description: "Invoice" },
                { description: "Status" },
                { description: "Amount", className: "text-right" },
              ]}
              rows={[
                { cells: [{ content: "INV001" }, { content: "Paid" }, { content: "$250.00", className: "text-right" }] },
                { cells: [{ content: "INV002" }, { content: "Pending" }, { content: "$150.00", className: "text-right" }] },
              ]}
              footer={{ cells: [{ content: "Total", className: "font-medium" }, { content: "" }, { content: "$400.00", className: "text-right" }] }}
            />
          }
          showDefaultFooterButton={false}
        />

        <Card4u
          title="Chart4u"
          content={
            <Chart4u
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
      </div>
    </div>
  )
}