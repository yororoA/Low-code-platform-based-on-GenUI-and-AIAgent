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
          adminOutput={{
  "necessary": true,
  "uiDescription": "一个简单的记事本应用界面，包含笔记列表和编辑区域。左侧显示所有笔记的标题列表，右侧显示当前选中的笔记内容编辑区域。用户可以创建新笔记、编辑现有笔记、保存和删除笔记。",
  "uiNeeds": [
    "Card",
    "CardHeader",
    "CardTitle",
    "CardContent",
    "CardFooter",
    "Button",
    "Input",
    "Textarea",
    "div",
    "span",
    "Separator",
    "Table",
    "TableHeader",
    "TableBody",
    "TableRow",
    "TableCell",
    "Badge"
  ]
}}
          structureOutput={{
    "uiTree": "{\"type\": \"div\", \"id\": \"root\", \"props\": {\"className\": \"flex h-screen\"}, \"children\": [{\"type\": \"div\", \"id\": \"sidebar-container\", \"props\": {\"className\": \"w-1/4 border-r flex flex-col\"}, \"children\": [{\"type\": \"Card\", \"id\": \"sidebar-card\", \"props\": {\"className\": \"flex-1\"}, \"children\": [{\"type\": \"CardHeader\", \"id\": \"sidebar-header\", \"props\": {\"className\": \"p-4 border-b\"}, \"children\": [{\"type\": \"CardTitle\", \"id\": \"sidebar-title\", \"props\": {\"className\": \"text-lg font-bold\"}, \"children\": [{\"type\": \"text\", \"id\": \"sidebar-title-text\", \"props\": {\"content\": \"笔记列表\"}}]}, {\"type\": \"Button\", \"id\": \"new-note-button\", \"props\": {\"variant\": \"default\", \"size\": \"sm\", \"className\": \"mt-2\"}, \"children\": [{\"type\": \"text\", \"id\": \"new-note-button-text\", \"props\": {\"content\": \"新建笔记\"}}]}]}, {\"type\": \"CardContent\", \"id\": \"sidebar-content\", \"props\": {\"className\": \"flex-1 p-4 overflow-y-auto\"}, \"children\": [{\"type\": \"Table\", \"id\": \"notes-table\", \"props\": {\"className\": \"w-full\"}, \"children\": [{\"type\": \"TableHeader\", \"id\": \"notes-table-header\", \"props\": {}, \"children\": [{\"type\": \"TableRow\", \"id\": \"notes-table-header-row\", \"props\": {}, \"children\": [{\"type\": \"TableHead\", \"id\": \"notes-table-header-title\", \"props\": {\"className\": \"text-left\"}, \"children\": [{\"type\": \"text\", \"id\": \"notes-table-header-title-text\", \"props\": {\"content\": \"标题\"}}]}, {\"type\": \"TableHead\", \"id\": \"notes-table-header-status\", \"props\": {\"className\": \"text-left w-20\"}, \"children\": [{\"type\": \"text\", \"id\": \"notes-table-header-status-text\", \"props\": {\"content\": \"状态\"}}]}]}]}, {\"type\": \"TableBody\", \"id\": \"notes-table-body\", \"props\": {}, \"children\": [{\"type\": \"TableRow\", \"id\": \"note-item-1\", \"props\": {\"className\": \"cursor-pointer hover:bg-gray-50\"}, \"children\": [{\"type\": \"TableCell\", \"id\": \"note-item-1-title\", \"props\": {\"className\": \"py-3\"}, \"children\": [{\"type\": \"text\", \"id\": \"note-item-1-title-text\", \"props\": {\"content\": \"示例笔记 1\"}}]}, {\"type\": \"TableCell\", \"id\": \"note-item-1-status\", \"props\": {\"className\": \"py-3\"}, \"children\": [{\"type\": \"Badge\", \"id\": \"note-item-1-badge\", \"props\": {\"variant\": \"default\", \"className\": \"text-xs\"}, \"children\": [{\"type\": \"text\", \"id\": \"note-item-1-badge-text\", \"props\": {\"content\": \"已保存\"}}]}]}]}, {\"type\": \"Separator\", \"id\": \"separator-1\", \"props\": {\"orientation\": \"horizontal\", \"className\": \"my-2\"}}, {\"type\": \"TableRow\", \"id\": \"note-item-2\", \"props\": {\"className\": \"cursor-pointer hover:bg-gray-50\"}, \"children\": [{\"type\": \"TableCell\", \"id\": \"note-item-2-title\", \"props\": {\"className\": \"py-3\"}, \"children\": [{\"type\": \"text\", \"id\": \"note-item-2-title-text\", \"props\": {\"content\": \"示例笔记 2\"}}]}, {\"type\": \"TableCell\", \"id\": \"note-item-2-status\", \"props\": {\"className\": \"py-3\"}, \"children\": [{\"type\": \"Badge\", \"id\": \"note-item-2-badge\", \"props\": {\"variant\": \"outline\", \"className\": \"text-xs\"}, \"children\": [{\"type\": \"text\", \"id\": \"note-item-2-badge-text\", \"props\": {\"content\": \"未保存\"}}]}]}]}]}]}]}]}]}, {\"type\": \"div\", \"id\": \"main-container\", \"props\": {\"className\": \"flex-1 flex flex-col\"}, \"children\": [{\"type\": \"Card\", \"id\": \"main-card\", \"props\": {\"className\": \"flex-1\"}, \"children\": [{\"type\": \"CardHeader\", \"id\": \"editor-header\", \"props\": {\"className\": \"p-4 border-b flex justify-between items-center\"}, \"children\": [{\"type\": \"Input\", \"id\": \"note-title-input\", \"props\": {\"type\": \"text\", \"placeholder\": \"笔记标题\", \"className\": \"flex-1\"}}, {\"type\": \"div\", \"id\": \"editor-actions\", \"props\": {\"className\": \"flex gap-2\"}, \"children\": [{\"type\": \"Button\", \"id\": \"save-button\", \"props\": {\"variant\": \"default\", \"size\": \"sm\"}, \"children\": [{\"type\": \"text\", \"id\": \"save-button-text\", \"props\": {\"content\": \"保存\"}}]}, {\"type\": \"Button\", \"id\": \"delete-button\", \"props\": {\"variant\": \"destructive\", \"size\": \"sm\"}, \"children\": [{\"type\": \"text\", \"id\": \"delete-button-text\", \"props\": {\"content\": \"删除\"}}]}]}]}, {\"type\": \"Separator\", \"id\": \"separator-2\", \"props\": {\"orientation\": \"horizontal\", \"className\": \"my-4\"}}, {\"type\": \"CardContent\", \"id\": \"editor-content\", \"props\": {\"className\": \"flex-1 p-4\"}, \"children\": [{\"type\": \"Textarea\", \"id\": \"note-content-textarea\", \"props\": {\"placeholder\": \"输入笔记内容...\", \"className\": \"w-full h-full min-h-[300px]\"}}]}]}]}]}",
}}
          styleOutput={{
    "styles": [
        {
            "id": "root",
            "className": "flex h-screen bg-gradient-to-br from-amber-50 to-orange-50"
        },
        {
            "id": "sidebar-container",
            "className": "w-1/4 border-r border-amber-200 bg-white shadow-lg flex flex-col"
        },
        {
            "id": "sidebar-card",
            "className": "flex-1 bg-transparent"
        },
        {
            "id": "sidebar-header",
            "className": "p-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50"
        },
        {
            "id": "sidebar-title",
            "className": "text-lg font-bold text-amber-900"
        },
        {
            "id": "sidebar-title-text",
            "className": ""
        },
        {
            "id": "new-note-button",
            "className": "mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-md"
        },
        {
            "id": "new-note-button-text",
            "className": ""
        },
        {
            "id": "sidebar-content",
            "className": "flex-1 p-4 overflow-y-auto bg-white"
        },
        {
            "id": "notes-table",
            "className": "w-full"
        },
        {
            "id": "notes-table-header",
            "className": ""
        },
        {
            "id": "notes-table-header-row",
            "className": "bg-amber-50"
        },
        {
            "id": "notes-table-header-title",
            "className": "text-left text-amber-800 font-semibold py-3"
        },
        {
            "id": "notes-table-header-title-text",
            "className": ""
        },
        {
            "id": "notes-table-header-status",
            "className": "text-left w-20 text-amber-800 font-semibold py-3"
        },
        {
            "id": "notes-table-header-status-text",
            "className": ""
        },
        {
            "id": "notes-table-body",
            "className": ""
        },
        {
            "id": "note-item-1",
            "className": "cursor-pointer hover:bg-amber-50 transition-colors duration-200"
        },
        {
            "id": "note-item-1-title",
            "className": "py-3 text-amber-900"
        },
        {
            "id": "note-item-1-title-text",
            "className": ""
        },
        {
            "id": "note-item-1-status",
            "className": "py-3"
        },
        {
            "id": "note-item-1-badge",
            "className": "text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
        },
        {
            "id": "note-item-1-badge-text",
            "className": ""
        },
        {
            "id": "separator-1",
            "className": "my-2 bg-amber-100"
        },
        {
            "id": "note-item-2",
            "className": "cursor-pointer hover:bg-amber-50 transition-colors duration-200"
        },
        {
            "id": "note-item-2-title",
            "className": "py-3 text-amber-900"
        },
        {
            "id": "note-item-2-title-text",
            "className": ""
        },
        {
            "id": "note-item-2-status",
            "className": "py-3"
        },
        {
            "id": "note-item-2-badge",
            "className": "text-xs bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
        },
        {
            "id": "note-item-2-badge-text",
            "className": ""
        },
        {
            "id": "main-container",
            "className": "flex-1 flex flex-col p-6"
        },
        {
            "id": "main-card",
            "className": "flex-1 bg-white rounded-xl shadow-lg border border-amber-100"
        },
        {
            "id": "editor-header",
            "className": "p-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 flex justify-between items-center"
        },
        {
            "id": "note-title-input",
            "className": "flex-1 bg-white border border-amber-200 text-amber-900 placeholder-amber-400 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 rounded-lg px-4 py-2 shadow-sm"
        },
        {
            "id": "editor-actions",
            "className": "flex gap-2"
        },
        {
            "id": "save-button",
            "className": "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium shadow-md"
        },
        {
            "id": "save-button-text",
            "className": ""
        },
        {
            "id": "delete-button",
            "className": "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium shadow-md"
        },
        {
            "id": "delete-button-text",
            "className": ""
        },
        {
            "id": "separator-2",
            "className": "my-4 bg-amber-100"
        },
        {
            "id": "editor-content",
            "className": "flex-1 p-4 bg-white"
        },
        {
            "id": "note-content-textarea",
            "className": "w-full h-full min-h-[300px] bg-white border border-amber-200 text-amber-900 placeholder-amber-400 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 rounded-lg px-4 py-3 shadow-sm resize-none"
        }
    ]
}}
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
