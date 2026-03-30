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
// import { ThreeOutputPreviewCard } from "../../lib/renderByAST"
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
        {/* <ThreeOutputPreviewCard
          adminOutput={ecommerceDashboardAdminOutputMock}
          structureOutput={ecommerceDashboardStructureOutputMock}
          styleOutput={ecommerceDashboardStyleOutputMock}
        /> */}

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
