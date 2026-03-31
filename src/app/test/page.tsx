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
  "uiDescription": "一个简洁的记事本应用界面，左侧为笔记列表区域，右侧为笔记编辑区域。笔记列表显示所有笔记的标题和最后修改时间，支持点击选择笔记进行编辑。编辑区域包含标题输入框和内容文本区域，底部有保存和删除按钮。",
  "uiNeeds": [
    "div",
    "Card",
    "CardHeader",
    "CardTitle",
    "CardContent",
    "CardFooter",
    "Button",
    "Textarea",
    "Input",
    "Table",
    "TableHeader",
    "TableBody",
    "TableRow",
    "TableCell",
    "Separator",
    "Badge",
    "Alert",
    "AlertTitle",
    "AlertDescription"
  ]
}}
          structureOutput={{
    "uiTree": "{\"type\":\"div\",\"id\":\"root\",\"props\":{\"className\":\"flex h-screen\"},\"children\":[{\"type\":\"Card\",\"id\":\"notes-list-card\",\"props\":{\"className\":\"w-1/3 border-r rounded-none\"},\"children\":[{\"type\":\"CardHeader\",\"id\":\"notes-list-header\",\"props\":{\"className\":\"p-4 border-b\"},\"children\":[{\"type\":\"CardTitle\",\"id\":\"notes-list-title\",\"props\":{\"className\":\"text-lg font-semibold\"},\"children\":[{\"type\":\"text\",\"id\":\"notes-list-title-text\",\"props\":{\"content\":\"笔记列表\"}}]}]},{\"type\":\"CardContent\",\"id\":\"notes-list-content\",\"props\":{\"className\":\"p-0\"},\"children\":[{\"type\":\"Table\",\"id\":\"notes-table\",\"props\":{\"className\":\"w-full\"},\"children\":[{\"type\":\"TableHeader\",\"id\":\"notes-table-header\",\"props\":{\"className\":\"bg-gray-50\"},\"children\":[{\"type\":\"TableRow\",\"id\":\"notes-table-header-row\",\"children\":[{\"type\":\"TableHead\",\"id\":\"notes-table-header-title\",\"props\":{\"className\":\"font-medium\"},\"children\":[{\"type\":\"text\",\"id\":\"notes-table-header-title-text\",\"props\":{\"content\":\"标题\"}}]},{\"type\":\"TableHead\",\"id\":\"notes-table-header-time\",\"props\":{\"className\":\"font-medium text-right\"},\"children\":[{\"type\":\"text\",\"id\":\"notes-table-header-time-text\",\"props\":{\"content\":\"修改时间\"}}]}]}]},{\"type\":\"TableBody\",\"id\":\"notes-table-body\",\"children\":[{\"type\":\"TableRow\",\"id\":\"notes-table-row-1\",\"props\":{\"className\":\"cursor-pointer hover:bg-gray-50\",\"onClick\":\"selectNote(1)\"},\"children\":[{\"type\":\"TableCell\",\"id\":\"notes-table-cell-title-1\",\"props\":{\"className\":\"font-medium\"},\"children\":[{\"type\":\"text\",\"id\":\"notes-table-cell-title-text-1\",\"props\":{\"content\":\"示例笔记\"}}]},{\"type\":\"TableCell\",\"id\":\"notes-table-cell-time-1\",\"props\":{\"className\":\"text-gray-500 text-right\"},\"children\":[{\"type\":\"text\",\"id\":\"notes-table-cell-time-text-1\",\"props\":{\"content\":\"2023-10-01\"}}]}]},{\"type\":\"TableRow\",\"id\":\"notes-table-row-2\",\"props\":{\"className\":\"cursor-pointer hover:bg-gray-50\",\"onClick\":\"selectNote(2)\"},\"children\":[{\"type\":\"TableCell\",\"id\":\"notes-table-cell-title-2\",\"props\":{\"className\":\"font-medium\"},\"children\":[{\"type\":\"text\",\"id\":\"notes-table-cell-title-text-2\",\"props\":{\"content\":\"另一个笔记\"}}]},{\"type\":\"TableCell\",\"id\":\"notes-table-cell-time-2\",\"props\":{\"className\":\"text-gray-500 text-right\"},\"children\":[{\"type\":\"text\",\"id\":\"notes-table-cell-time-text-2\",\"props\":{\"content\":\"2023-09-28\"}}]}]}]}]}]}]},{\"type\":\"Card\",\"id\":\"editor-card\",\"props\":{\"className\":\"w-2/3 rounded-none\"},\"children\":[{\"type\":\"CardHeader\",\"id\":\"editor-header\",\"props\":{\"className\":\"p-4 border-b\"},\"children\":[{\"type\":\"CardTitle\",\"id\":\"editor-title\",\"props\":{\"className\":\"text-lg font-semibold\"},\"children\":[{\"type\":\"text\",\"id\":\"editor-title-text\",\"props\":{\"content\":\"编辑笔记\"}}]}]},{\"type\":\"CardContent\",\"id\":\"editor-content\",\"props\":{\"className\":\"p-4 space-y-4\"},\"children\":[{\"type\":\"div\",\"id\":\"title-input-container\",\"props\":{\"className\":\"space-y-2\"},\"children\":[{\"type\":\"text\",\"id\":\"title-label\",\"props\":{\"content\":\"标题\"}},{\"type\":\"Input\",\"id\":\"title-input\",\"props\":{\"type\":\"text\",\"placeholder\":\"输入笔记标题\",\"className\":\"w-full\"}}]},{\"type\":\"div\",\"id\":\"content-textarea-container\",\"props\":{\"className\":\"space-y-2\"},\"children\":[{\"type\":\"text\",\"id\":\"content-label\",\"props\":{\"content\":\"内容\"}},{\"type\":\"Textarea\",\"id\":\"content-textarea\",\"props\":{\"placeholder\":\"输入笔记内容\",\"className\":\"w-full min-h-64\"}}]}]},{\"type\":\"CardFooter\",\"id\":\"editor-footer\",\"props\":{\"className\":\"p-4 border-t flex justify-end space-x-2\"},\"children\":[{\"type\":\"Button\",\"id\":\"save-button\",\"props\":{\"variant\":\"default\",\"size\":\"default\",\"className\":\"\"},\"children\":[{\"type\":\"text\",\"id\":\"save-button-text\",\"props\":{\"content\":\"保存\"}}]},{\"type\":\"Button\",\"id\":\"delete-button\",\"props\":{\"variant\":\"destructive\",\"size\":\"default\",\"className\":\"\"},\"children\":[{\"type\":\"text\",\"id\":\"delete-button-text\",\"props\":{\"content\":\"删除\"}}]}]}]}]}",
}}
          styleOutput={{
    "styles": [
        {
            "id": "root",
            "className": "flex h-screen bg-gray-50"
        },
        {
            "id": "notes-list-card",
            "className": "w-1/3 border-r border-gray-200 rounded-none bg-white shadow-sm"
        },
        {
            "id": "notes-list-header",
            "className": "p-4 border-b border-gray-200 bg-gray-50"
        },
        {
            "id": "notes-list-title",
            "className": "text-lg font-semibold text-gray-800"
        },
        {
            "id": "notes-list-title-text",
            "className": ""
        },
        {
            "id": "notes-list-content",
            "className": "p-0"
        },
        {
            "id": "notes-table",
            "className": "w-full"
        },
        {
            "id": "notes-table-header",
            "className": "bg-gray-50"
        },
        {
            "id": "notes-table-header-row",
            "className": ""
        },
        {
            "id": "notes-table-header-title",
            "className": "font-medium text-gray-700 px-4 py-3"
        },
        {
            "id": "notes-table-header-title-text",
            "className": ""
        },
        {
            "id": "notes-table-header-time",
            "className": "font-medium text-gray-700 text-right px-4 py-3"
        },
        {
            "id": "notes-table-header-time-text",
            "className": ""
        },
        {
            "id": "notes-table-body",
            "className": ""
        },
        {
            "id": "notes-table-row-1",
            "className": "cursor-pointer hover:bg-gray-50 border-b border-gray-100"
        },
        {
            "id": "notes-table-cell-title-1",
            "className": "font-medium text-gray-800 px-4 py-3"
        },
        {
            "id": "notes-table-cell-title-text-1",
            "className": ""
        },
        {
            "id": "notes-table-cell-time-1",
            "className": "text-gray-500 text-right px-4 py-3"
        },
        {
            "id": "notes-table-cell-time-text-1",
            "className": ""
        },
        {
            "id": "notes-table-row-2",
            "className": "cursor-pointer hover:bg-gray-50 border-b border-gray-100"
        },
        {
            "id": "notes-table-cell-title-2",
            "className": "font-medium text-gray-800 px-4 py-3"
        },
        {
            "id": "notes-table-cell-title-text-2",
            "className": ""
        },
        {
            "id": "notes-table-cell-time-2",
            "className": "text-gray-500 text-right px-4 py-3"
        },
        {
            "id": "notes-table-cell-time-text-2",
            "className": ""
        },
        {
            "id": "editor-card",
            "className": "w-2/3 rounded-none bg-white shadow-sm"
        },
        {
            "id": "editor-header",
            "className": "p-4 border-b border-gray-200 bg-gray-50"
        },
        {
            "id": "editor-title",
            "className": "text-lg font-semibold text-gray-800"
        },
        {
            "id": "editor-title-text",
            "className": ""
        },
        {
            "id": "editor-content",
            "className": "p-4 space-y-4"
        },
        {
            "id": "title-input-container",
            "className": "space-y-2"
        },
        {
            "id": "title-label",
            "className": "text-sm font-medium text-gray-700"
        },
        {
            "id": "title-input",
            "className": "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        },
        {
            "id": "content-textarea-container",
            "className": "space-y-2"
        },
        {
            "id": "content-label",
            "className": "text-sm font-medium text-gray-700"
        },
        {
            "id": "content-textarea",
            "className": "w-full min-h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        },
        {
            "id": "editor-footer",
            "className": "p-4 border-t border-gray-200 flex justify-end space-x-2"
        },
        {
            "id": "save-button",
            "className": "bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
        },
        {
            "id": "save-button-text",
            "className": ""
        },
        {
            "id": "delete-button",
            "className": "bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
        },
        {
            "id": "delete-button-text",
            "className": ""
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
