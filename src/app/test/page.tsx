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
  text: "好的，老板。我将为您创建一个简洁现代的日记记录页面。",
  necessary: true,
  uiDescription: "一个简洁现代的日记记录页面，包含编辑器和日记列表。",
  uiNeeds: ["Card", "Button", "Separator"],
}

const almanacUiTree = {"type": "div", "id": "root", "props": {"className": "min-h-screen bg-gray-50 p-6"}, "children": [{"type": "div", "id": "header", "props": {"className": "mb-8 text-center"}, "children": [{"type": "text", "id": "header-text", "props": {"content": "我的日记本"}}]}, {"type": "div", "id": "main-content", "props": {"className": "flex flex-col md:flex-row gap-6"}, "children": [{"type": "Card", "id": "editor-card", "props": {"className": "flex-1"}, "children": [{"type": "CardHeader", "id": "editor-header", "props": {"className": "pb-3"}, "children": [{"type": "CardTitle", "id": "editor-title", "props": {"className": "text-xl"}, "children": [{"type": "text", "id": "editor-title-text", "props": {"content": "写新日记"}}]}, {"type": "CardDescription", "id": "editor-description", "props": {"className": "text-sm"}, "children": [{"type": "text", "id": "editor-description-text", "props": {"content": "记录你的想法和心情"}}]}]}, {"type": "CardContent", "id": "editor-content", "props": {"className": "space-y-4"}, "children": [{"type": "div", "id": "title-section", "props": {"className": "space-y-2"}, "children": [{"type": "text", "id": "title-label", "props": {"content": "标题"}}, {"type": "div", "id": "title-input-wrapper", "props": {"className": "border rounded p-2 bg-white"}, "children": [{"type": "text", "id": "title-input-placeholder", "props": {"content": "输入日记标题..."}}]}]}, {"type": "div", "id": "date-section", "props": {"className": "space-y-2"}, "children": [{"type": "text", "id": "date-label", "props": {"content": "日期"}}, {"type": "div", "id": "date-display", "props": {"className": "text-gray-600"}, "children": [{"type": "text", "id": "date-text", "props": {"content": "2023-10-05"}}]}]}, {"type": "Separator", "id": "separator-1", "props": {"orientation": "horizontal", "className": "my-2"}}, {"type": "div", "id": "content-section", "props": {"className": "space-y-2"}, "children": [{"type": "text", "id": "content-label", "props": {"content": "内容"}}, {"type": "div", "id": "content-editor", "props": {"className": "border rounded p-3 min-h-[200px] bg-white"}, "children": [{"type": "text", "id": "content-placeholder", "props": {"content": "开始写作..."}}]}]}]}, {"type": "CardFooter", "id": "editor-footer", "props": {"className": "pt-4"}, "children": [{"type": "Button", "id": "save-button", "props": {"variant": "default", "size": "default", "className": "w-full"}, "children": [{"type": "text", "id": "save-button-text", "props": {"content": "保存日记"}}]}]}]}, {"type": "Card", "id": "list-card", "props": {"className": "flex-1"}, "children": [{"type": "CardHeader", "id": "list-header", "props": {"className": "pb-3"}, "children": [{"type": "CardTitle", "id": "list-title", "props": {"className": "text-xl"}, "children": [{"type": "text", "id": "list-title-text", "props": {"content": "日记列表"}}]}, {"type": "CardDescription", "id": "list-description", "props": {"className": "text-sm"}, "children": [{"type": "text", "id": "list-description-text", "props": {"content": "查看和管理你的日记"}}]}]}, {"type": "CardContent", "id": "list-content", "props": {"className": "space-y-4"}, "children": [{"type": "div", "id": "list-item-1", "props": {"className": "border rounded p-4 bg-white"}, "children": [{"type": "div", "id": "list-item-header", "props": {"className": "flex justify-between items-center mb-2"}, "children": [{"type": "text", "id": "list-item-title-1", "props": {"content": "美好的一天"}}, {"type": "text", "id": "list-item-date-1", "props": {"content": "2023-10-04"}}]}, {"type": "div", "id": "list-item-preview-1", "props": {"className": "text-gray-600 truncate"}, "children": [{"type": "text", "id": "list-item-content-1", "props": {"content": "今天天气晴朗，心情很好..."}}]}]}, {"type": "div", "id": "list-item-2", "props": {"className": "border rounded p-4 bg-white"}, "children": [{"type": "div", "id": "list-item-header-2", "props": {"className": "flex justify-between items-center mb-2"}, "children": [{"type": "text", "id": "list-item-title-2", "props": {"content": "工作反思"}}, {"type": "text", "id": "list-item-date-2", "props": {"content": "2023-10-03"}}]}, {"type": "div", "id": "list-item-preview-2", "props": {"className": "text-gray-600 truncate"}, "children": [{"type": "text", "id": "list-item-content-2", "props": {"content": "项目进展顺利，但需要改进沟通..."}}]}]}, {"type": "div", "id": "list-empty-state", "props": {"className": "text-center text-gray-500 py-8"}, "children": [{"type": "text", "id": "empty-text", "props": {"content": "暂无更多日记"}}]}]}]}]}]}

const structureOutputMock = {
  uiTree: JSON.stringify(almanacUiTree),
}

const styleOutputMock = {
    "temp": "Designing a clean, modern diary interface with warm amber/stone color accents, subtle shadows, and responsive layout.",
    "styles": [
        {
            "id": "root",
            "className": "min-h-screen bg-gray-50 p-6"
        },
        {
            "id": "header",
            "className": "mb-8 text-center"
        },
        {
            "id": "header-text",
            "className": "text-3xl font-bold text-gray-900"
        },
        {
            "id": "main-content",
            "className": "flex flex-col md:flex-row gap-6"
        },
        {
            "id": "editor-card",
            "className": "flex-1 bg-white border border-gray-200 rounded-lg shadow-sm"
        },
        {
            "id": "editor-header",
            "className": "pb-3 border-b border-gray-100"
        },
        {
            "id": "editor-title",
            "className": "text-xl font-semibold text-gray-900"
        },
        {
            "id": "editor-title-text",
            "className": ""
        },
        {
            "id": "editor-description",
            "className": "text-sm text-gray-500"
        },
        {
            "id": "editor-description-text",
            "className": ""
        },
        {
            "id": "editor-content",
            "className": "space-y-4"
        },
        {
            "id": "title-section",
            "className": "space-y-2"
        },
        {
            "id": "title-label",
            "className": "text-sm font-medium text-gray-700"
        },
        {
            "id": "title-input-wrapper",
            "className": "border border-gray-300 rounded-md p-2 bg-white focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500"
        },
        {
            "id": "title-input-placeholder",
            "className": "text-gray-400"
        },
        {
            "id": "date-section",
            "className": "space-y-2"
        },
        {
            "id": "date-label",
            "className": "text-sm font-medium text-gray-700"
        },
        {
            "id": "date-display",
            "className": "text-gray-600"
        },
        {
            "id": "date-text",
            "className": ""
        },
        {
            "id": "separator-1",
            "className": "my-2 bg-gray-200"
        },
        {
            "id": "content-section",
            "className": "space-y-2"
        },
        {
            "id": "content-label",
            "className": "text-sm font-medium text-gray-700"
        },
        {
            "id": "content-editor",
            "className": "border border-gray-300 rounded-md p-3 min-h-[200px] bg-white focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500"
        },
        {
            "id": "content-placeholder",
            "className": "text-gray-400"
        },
        {
            "id": "editor-footer",
            "className": "pt-4 border-t border-gray-100"
        },
        {
            "id": "save-button",
            "className": "w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        },
        {
            "id": "save-button-text",
            "className": ""
        },
        {
            "id": "list-card",
            "className": "flex-1 bg-white border border-gray-200 rounded-lg shadow-sm"
        },
        {
            "id": "list-header",
            "className": "pb-3 border-b border-gray-100"
        },
        {
            "id": "list-title",
            "className": "text-xl font-semibold text-gray-900"
        },
        {
            "id": "list-title-text",
            "className": ""
        },
        {
            "id": "list-description",
            "className": "text-sm text-gray-500"
        },
        {
            "id": "list-description-text",
            "className": ""
        },
        {
            "id": "list-content",
            "className": "space-y-4"
        },
        {
            "id": "list-item-1",
            "className": "border border-gray-200 rounded-lg p-4 bg-white hover:bg-amber-50 transition-colors cursor-pointer"
        },
        {
            "id": "list-item-header",
            "className": "flex justify-between items-center mb-2"
        },
        {
            "id": "list-item-title-1",
            "className": "font-medium text-gray-900"
        },
        {
            "id": "list-item-date-1",
            "className": "text-sm text-amber-600"
        },
        {
            "id": "list-item-preview-1",
            "className": "text-gray-600 truncate"
        },
        {
            "id": "list-item-content-1",
            "className": ""
        },
        {
            "id": "list-item-2",
            "className": "border border-gray-200 rounded-lg p-4 bg-white hover:bg-amber-50 transition-colors cursor-pointer"
        },
        {
            "id": "list-item-header-2",
            "className": "flex justify-between items-center mb-2"
        },
        {
            "id": "list-item-title-2",
            "className": "font-medium text-gray-900"
        },
        {
            "id": "list-item-date-2",
            "className": "text-sm text-amber-600"
        },
        {
            "id": "list-item-preview-2",
            "className": "text-gray-600 truncate"
        },
        {
            "id": "list-item-content-2",
            "className": ""
        },
        {
            "id": "list-empty-state",
            "className": "text-center text-gray-500 py-8"
        },
        {
            "id": "empty-text",
            "className": ""
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
