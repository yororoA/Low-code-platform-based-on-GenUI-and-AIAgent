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

import { ThreeOutputPreviewCard } from "./three-output-preview-card"
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
  text: "好的，老板。我将为您创建一个暖色调、个性化的黄历日历。这个日历会采用温馨的配色方案（如橙色、黄色、米色等），并整合黄历信息（如宜忌事项、吉凶方位等）。我会先设计一个基本的日历界面，然后根据需要添加黄历数据展示。",
  necessary: true,
  uiDescription: "一个暖色调的个性化黄历日历界面，包含日历视图和黄历信息面板。日历部分显示日期，黄历部分展示每日的宜忌事项、吉凶等。",
  uiNeeds: ["Card", "Accordion", "Avatar", "Button", "Label", "Separator"],
}

const almanacUiTree = {
  type: "div",
  id: "root",
  props: {
    className: "min-h-screen p-4 md:p-6 grid gap-6 md:grid-cols-[2fr_1fr]",
  },
  children: [
    {
      type: "Card",
      id: "calendar-card",
      props: {
        className: "border-amber-200 bg-white/90",
      },
      children: [
        {
          type: "CardHeader",
          id: "calendar-header",
          children: [
            {
              type: "CardTitle",
              id: "calendar-title",
              children: [{ type: "text", id: "calendar-title-text", props: { content: "黄历日历" } }],
            },
            {
              type: "CardDescription",
              id: "calendar-description",
              children: [{ type: "text", id: "calendar-description-text", props: { content: "查看每日宜忌吉凶" } }],
            },
          ],
        },
        {
          type: "CardContent",
          id: "calendar-content",
          props: { className: "space-y-4" },
          children: [
            {
              type: "Label",
              id: "selected-date-label",
              children: [{ type: "text", id: "selected-date-label-text", props: { content: "今日日期" } }],
            },
            {
              type: "div",
              id: "selected-date-value",
              props: { className: "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm" },
              children: [{ type: "text", id: "selected-date-value-text", props: { content: "二零二六年三月二十四日" } }],
            },
            {
              type: "Separator",
              id: "calendar-separator",
              props: { className: "my-2", orientation: "horizontal" },
            },
            {
              type: "Accordion",
              id: "almanac-accordion",
              props: { type: "single", collapsible: true, className: "w-full" },
              children: [
                {
                  type: "AccordionItem",
                  id: "yi-item",
                  props: { value: "yi" },
                  children: [
                    {
                      type: "AccordionTrigger",
                      id: "yi-trigger",
                      children: [{ type: "text", id: "yi-trigger-text", props: { content: "宜" } }],
                    },
                    {
                      type: "AccordionContent",
                      id: "yi-content",
                      children: [{ type: "text", id: "yi-content-text", props: { content: "祭祀、祈福、开市、交易" } }],
                    },
                  ],
                },
                {
                  type: "AccordionItem",
                  id: "ji-item",
                  props: { value: "ji" },
                  children: [
                    {
                      type: "AccordionTrigger",
                      id: "ji-trigger",
                      children: [{ type: "text", id: "ji-trigger-text", props: { content: "忌" } }],
                    },
                    {
                      type: "AccordionContent",
                      id: "ji-content",
                      children: [{ type: "text", id: "ji-content-text", props: { content: "嫁娶、动土、安葬" } }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "Card",
      id: "detail-card",
      props: {
        className: "border-orange-200 bg-white/90",
      },
      children: [
        {
          type: "CardHeader",
          id: "detail-header",
          children: [
            {
              type: "CardTitle",
              id: "detail-title",
              children: [{ type: "text", id: "detail-title-text", props: { content: "当日信息" } }],
            },
            {
              type: "CardDescription",
              id: "detail-description",
              children: [{ type: "text", id: "detail-description-text", props: { content: "快速查看值日神与方位信息" } }],
            },
          ],
        },
        {
          type: "CardContent",
          id: "detail-content",
          props: { className: "space-y-3" },
          children: [
            {
              type: "Avatar",
              id: "symbol-avatar",
              props: { className: "h-12 w-12" },
              children: [
                { type: "AvatarImage", id: "symbol-avatar-image", props: { src: "https://github.com/shadcn.png", alt: "avatar" } },
                { type: "AvatarFallback", id: "symbol-avatar-fallback", children: [{ type: "text", id: "symbol-avatar-fallback-text", props: { content: "吉" } }] },
              ],
            },
            {
              type: "div",
              id: "direction-block",
              props: { className: "rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm" },
              children: [{ type: "text", id: "direction-text", props: { content: "财神方位：正东；喜神方位：西南" } }],
            },
          ],
        },
        {
          type: "CardFooter",
          id: "detail-footer",
          props: { className: "grid grid-cols-2 gap-2" },
          children: [
            {
              type: "Button",
              id: "view-detail-button",
              props: { variant: "outline", className: "w-full" },
              children: [{ type: "text", id: "view-detail-button-text", props: { content: "查看详情" } }],
            },
            {
              type: "Button",
              id: "next-day-button",
              props: { className: "w-full" },
              children: [{ type: "text", id: "next-day-button-text", props: { content: "切换明日" } }],
            },
          ],
        },
      ],
    },
  ],
}

const structureOutputMock = {
  uiTree: JSON.stringify(almanacUiTree),
}

const styleOutputMock = {
  temp: "Warm traditional Chinese almanac interface with amber/orange/stone color palette",
  styles: [
    {
      id: "root",
      className: "min-h-screen p-4 md:p-6 grid gap-6 md:grid-cols-[2fr_1fr] bg-gradient-to-br from-amber-50 to-orange-50",
    },
    {
      id: "calendar-card",
      className: "border-amber-200 bg-white/90 rounded-xl shadow-md",
    },
    {
      id: "calendar-header",
      className: "space-y-1",
    },
    {
      id: "calendar-title",
      className: "text-amber-900",
    },
    {
      id: "almanac-accordion",
      className: "rounded-lg border border-amber-200 px-3",
    },
    {
      id: "detail-card",
      className: "border-orange-200 bg-white/90 rounded-xl shadow-md",
    },
    {
      id: "next-day-button",
      className: "bg-orange-500 text-white hover:bg-orange-500/90",
    },
  ],
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
          adminOutput={adminOutputMock}
          structureOutput={structureOutputMock}
          styleOutput={styleOutputMock}
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
