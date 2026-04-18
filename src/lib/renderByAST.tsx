import type { ComponentType, ReactNode } from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import * as Ui from "@/components/ui"

// ── AST 节点类型 ──

type UiTreeNode = {
  type: string
  id: string
  props?: Record<string, unknown>
  children?: UiTreeNode[]
}

type StructureOutput = {
  uiTree: string
}

type StyleOutput = {
  styles: Array<{
    id: string
    className: string
    classNames?: Record<string, string>
  }>
}

type ThreeOutputPreviewCardProps = {
  structureOutput: StructureOutput
  styleOutput: StyleOutput
}

// ── 节点遍历工具 ──

function isUiTreeNode(value: unknown): value is UiTreeNode {
  if (!value || typeof value !== "object") return false
  const n = value as Partial<UiTreeNode>
  if (typeof n.type !== "string" || typeof n.id !== "string") return false
  if (n.children === undefined) return true
  if (!Array.isArray(n.children)) return false
  return n.children.every(isUiTreeNode)
}

function toUiTreeNodes(value: unknown): UiTreeNode[] {
  if (isUiTreeNode(value)) return [value]
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => (isUiTreeNode(item) ? [item] : []))
}

function getNodeChildren(node: UiTreeNode): UiTreeNode[] {
  const merged = [
    ...(node.children ?? []),
    ...toUiTreeNodes(node.props?.content),
    ...toUiTreeNodes(node.props?.children),
  ]
  const deduped = new Map<string, UiTreeNode>()
  for (const child of merged) {
    if (!deduped.has(child.id)) deduped.set(child.id, child)
  }
  return [...deduped.values()]
}

function collectIds(node: UiTreeNode): string[] {
  return [node.id, ...getNodeChildren(node).flatMap(collectIds)]
}

// ── Props 安全读取 ──

function str(node: UiTreeNode, key: string): string | undefined {
  const v = node.props?.[key]
  return typeof v === "string" ? v : undefined
}

function bool(node: UiTreeNode, key: string): boolean | undefined {
  const v = node.props?.[key]
  return typeof v === "boolean" ? v : undefined
}

function num(node: UiTreeNode, key: string): number | undefined {
  const v = node.props?.[key]
  return typeof v === "number" ? v : undefined
}

function oneOf<T extends string>(node: UiTreeNode, key: string, allowed: readonly T[], fallback: T): T {
  const v = str(node, key)
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

// ── 组件注册表 ──

type RenderFn = (
  node: UiTreeNode,
  className: string | undefined,
  children: ReactNode[],
) => ReactNode

/**
 * 快捷工厂：将一个 React 组件包装为「仅传 className + children」的 RenderFn。
 * 覆盖绝大多数纯容器/纯展示组件。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function simple(Comp: ComponentType<any>): RenderFn {
  // eslint-disable-next-line react/display-name
  return (node, className, children) => (
    <Comp key={node.id} className={className}>
      {children}
    </Comp>
  )
}

const BUTTON_VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const
const BUTTON_SIZES = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const
const BADGE_VARIANTS = ["default", "secondary", "destructive", "outline"] as const
const ALERT_VARIANTS = ["default", "destructive"] as const

const registry: Record<string, RenderFn> = {
  // ─── HTML 原生 ───
  div: simple("div" as unknown as ComponentType),
  span: simple("span" as unknown as ComponentType),
  p: simple("p" as unknown as ComponentType),
  h1: simple("h1" as unknown as ComponentType),
  h2: simple("h2" as unknown as ComponentType),
  h3: simple("h3" as unknown as ComponentType),
  h4: simple("h4" as unknown as ComponentType),
  h5: simple("h5" as unknown as ComponentType),
  h6: simple("h6" as unknown as ComponentType),
  ul: simple("ul" as unknown as ComponentType),
  ol: simple("ol" as unknown as ComponentType),
  li: simple("li" as unknown as ComponentType),
  nav: simple("nav" as unknown as ComponentType),
  section: simple("section" as unknown as ComponentType),
  article: simple("article" as unknown as ComponentType),
  header: simple("header" as unknown as ComponentType),
  footer: simple("footer" as unknown as ComponentType),
  main: simple("main" as unknown as ComponentType),
  aside: simple("aside" as unknown as ComponentType),

  img: (node, className) => (
    <Image
      key={node.id}
      className={className}
      src={str(node, "src") ?? "/next.svg"}
      alt={str(node, "alt") ?? ""}
      width={160}
      height={160}
      unoptimized
    />
  ),

  text: (node, className) => (
    <span key={node.id} className={className}>
      {str(node, "content") ?? ""}
    </span>
  ),

  // ─── Card ───
  Card: simple(Ui.Card),
  CardHeader: simple(Ui.CardHeader),
  CardTitle: simple(Ui.CardTitle),
  CardDescription: simple(Ui.CardDescription),
  CardContent: simple(Ui.CardContent),
  CardFooter: simple(Ui.CardFooter),
  CardAction: simple(Ui.CardAction),

  // ─── Button ───
  Button: (node, className, children) => (
    <Ui.Button
      key={node.id}
      className={className}
      variant={oneOf(node, "variant", BUTTON_VARIANTS, "default")}
      size={oneOf(node, "size", BUTTON_SIZES, "default")}
    >
      {children}
    </Ui.Button>
  ),

  // ─── Badge ───
  Badge: (node, className, children) => (
    <Ui.Badge
      key={node.id}
      className={className}
      variant={oneOf(node, "variant", BADGE_VARIANTS, "default")}
    >
      {children}
    </Ui.Badge>
  ),

  // ─── Label ───
  Label: simple(Ui.Label),

  // ─── Separator ───
  Separator: (node, className) => (
    <Ui.Separator
      key={node.id}
      className={className}
      orientation={oneOf(node, "orientation", ["horizontal", "vertical"] as const, "horizontal")}
    />
  ),

  // ─── Input / Textarea / Checkbox ───
  Input: (node, className) => (
    <Ui.Input
      key={node.id}
      className={className}
      type={str(node, "type") ?? "text"}
      placeholder={str(node, "placeholder")}
      disabled={bool(node, "disabled")}
    />
  ),

  Textarea: (node, className) => (
    <Ui.Textarea
      key={node.id}
      className={className}
      placeholder={str(node, "placeholder")}
      disabled={bool(node, "disabled")}
    />
  ),



  Checkbox: (node, className) => (
    <Ui.Checkbox
      key={node.id}
      className={className}
      checked={bool(node, "checked")}
      disabled={bool(node, "disabled")}
    />
  ),

  // ─── Accordion ───
  Accordion: (node, className, children) => {
    const type = oneOf(node, "type", ["single", "multiple"] as const, "single")
    if (type === "multiple") {
      return (
        <Ui.Accordion key={node.id} className={className} type="multiple">
          {children}
        </Ui.Accordion>
      )
    }
    return (
      <Ui.Accordion key={node.id} className={className} type="single" collapsible={bool(node, "collapsible")}>
        {children}
      </Ui.Accordion>
    )
  },

  AccordionItem: (node, className, children) => (
    <Ui.AccordionItem key={node.id} className={className} value={str(node, "value") ?? node.id}>
      {children}
    </Ui.AccordionItem>
  ),
  AccordionTrigger: simple(Ui.AccordionTrigger),
  AccordionContent: simple(Ui.AccordionContent),

  // ─── Avatar ───
  Avatar: simple(Ui.Avatar),
  AvatarImage: (node) => (
    <Ui.AvatarImage key={node.id} src={str(node, "src")} alt={str(node, "alt")} />
  ),
  AvatarFallback: simple(Ui.AvatarFallback),
  AvatarBadge: simple(Ui.AvatarBadge),
  AvatarGroup: simple(Ui.AvatarGroup),
  AvatarGroupCount: simple(Ui.AvatarGroupCount),

  // ─── Alert ───
  Alert: (node, className, children) => (
    <Ui.Alert key={node.id} className={className} variant={oneOf(node, "variant", ALERT_VARIANTS, "default")}>
      {children}
    </Ui.Alert>
  ),
  AlertTitle: simple(Ui.AlertTitle),
  AlertDescription: simple(Ui.AlertDescription),

  // ─── AlertDialog ───
  AlertDialog: (node, _cls, children) => (
    <Ui.AlertDialog key={node.id} defaultOpen>
      {children}
    </Ui.AlertDialog>
  ),
  AlertDialogTrigger: (node, className, children) => (
    <Ui.AlertDialogTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.AlertDialogTrigger>
  ),
  AlertDialogContent: simple(Ui.AlertDialogContent),
  AlertDialogHeader: simple(Ui.AlertDialogHeader),
  AlertDialogTitle: simple(Ui.AlertDialogTitle),
  AlertDialogDescription: simple(Ui.AlertDialogDescription),
  AlertDialogFooter: simple(Ui.AlertDialogFooter),
  AlertDialogMedia: simple(Ui.AlertDialogMedia),
  AlertDialogAction: (node, className, children) => (
    <Ui.AlertDialogAction
      key={node.id}
      className={className}
      variant={oneOf(node, "variant", BUTTON_VARIANTS, "default")}
    >
      {children}
    </Ui.AlertDialogAction>
  ),
  AlertDialogCancel: (node, className, children) => (
    <Ui.AlertDialogCancel
      key={node.id}
      className={className}
      variant={oneOf(node, "variant", BUTTON_VARIANTS, "outline")}
    >
      {children}
    </Ui.AlertDialogCancel>
  ),

  // ─── Dialog ───
  Dialog: (node, _cls, children) => (
    <Ui.Dialog key={node.id} defaultOpen>
      {children}
    </Ui.Dialog>
  ),
  DialogTrigger: (node, className, children) => (
    <Ui.DialogTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.DialogTrigger>
  ),
  DialogContent: (node, className, children) => (
    <Ui.DialogContent key={node.id} className={className} showCloseButton={bool(node, "showCloseButton") ?? true}>
      {children}
    </Ui.DialogContent>
  ),
  DialogHeader: simple(Ui.DialogHeader),
  DialogTitle: simple(Ui.DialogTitle),
  DialogDescription: simple(Ui.DialogDescription),
  DialogFooter: simple(Ui.DialogFooter),
  DialogClose: (node, className, children) => (
    <Ui.DialogClose key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.DialogClose>
  ),

  // ─── Table ───
  Table: simple(Ui.Table),
  TableHeader: simple(Ui.TableHeader),
  TableBody: simple(Ui.TableBody),
  TableFooter: simple(Ui.TableFooter),
  TableRow: simple(Ui.TableRow),
  TableHead: simple(Ui.TableHead),
  TableCell: simple(Ui.TableCell),
  TableCaption: simple(Ui.TableCaption),

  // ─── DropdownMenu ───
  DropdownMenu: (node, _cls, children) => (
    <Ui.DropdownMenu key={node.id}>{children}</Ui.DropdownMenu>
  ),
  DropdownMenuTrigger: (node, className, children) => (
    <Ui.DropdownMenuTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.DropdownMenuTrigger>
  ),
  DropdownMenuContent: (node, className, children) => (
    <Ui.DropdownMenuContent
      key={node.id}
      className={className}
      sideOffset={num(node, "sideOffset")}
      align={oneOf(node, "align", ["start", "center", "end"] as const, "start")}
    >
      {children}
    </Ui.DropdownMenuContent>
  ),
  DropdownMenuItem: (node, className, children) => (
    <Ui.DropdownMenuItem
      key={node.id}
      className={className}
      inset={bool(node, "inset")}
      variant={oneOf(node, "variant", ["default", "destructive"] as const, "default")}
    >
      {children}
    </Ui.DropdownMenuItem>
  ),
  DropdownMenuLabel: (node, className, children) => (
    <Ui.DropdownMenuLabel key={node.id} className={className} inset={bool(node, "inset")}>
      {children}
    </Ui.DropdownMenuLabel>
  ),
  DropdownMenuSeparator: (node, className) => (
    <Ui.DropdownMenuSeparator key={node.id} className={className} />
  ),
  DropdownMenuGroup: simple(Ui.DropdownMenuGroup),
  DropdownMenuCheckboxItem: (node, className, children) => (
    <Ui.DropdownMenuCheckboxItem key={node.id} className={className} checked={bool(node, "checked")}>
      {children}
    </Ui.DropdownMenuCheckboxItem>
  ),
  DropdownMenuRadioGroup: (node, _cls, children) => (
    <Ui.DropdownMenuRadioGroup key={node.id} value={str(node, "value")}>
      {children}
    </Ui.DropdownMenuRadioGroup>
  ),
  DropdownMenuRadioItem: (node, className, children) => (
    <Ui.DropdownMenuRadioItem key={node.id} className={className} value={str(node, "value") ?? ""}>
      {children}
    </Ui.DropdownMenuRadioItem>
  ),
  DropdownMenuSub: (node, _cls, children) => (
    <Ui.DropdownMenuSub key={node.id}>{children}</Ui.DropdownMenuSub>
  ),
  DropdownMenuSubTrigger: (node, className, children) => (
    <Ui.DropdownMenuSubTrigger key={node.id} className={className} inset={bool(node, "inset")}>
      {children}
    </Ui.DropdownMenuSubTrigger>
  ),
  DropdownMenuSubContent: simple(Ui.DropdownMenuSubContent),
  DropdownMenuShortcut: simple(Ui.DropdownMenuShortcut),

  // ─── ContextMenu ───
  ContextMenu: (node, _cls, children) => (
    <Ui.ContextMenu key={node.id}>{children}</Ui.ContextMenu>
  ),
  ContextMenuTrigger: simple(Ui.ContextMenuTrigger),
  ContextMenuContent: simple(Ui.ContextMenuContent),
  ContextMenuItem: (node, className, children) => (
    <Ui.ContextMenuItem
      key={node.id}
      className={className}
      inset={bool(node, "inset")}
      variant={oneOf(node, "variant", ["default", "destructive"] as const, "default")}
    >
      {children}
    </Ui.ContextMenuItem>
  ),
  ContextMenuLabel: (node, className, children) => (
    <Ui.ContextMenuLabel key={node.id} className={className} inset={bool(node, "inset")}>
      {children}
    </Ui.ContextMenuLabel>
  ),
  ContextMenuGroup: simple(Ui.ContextMenuGroup),
  ContextMenuSeparator: (node, className) => (
    <Ui.ContextMenuSeparator key={node.id} className={className} />
  ),
  ContextMenuCheckboxItem: (node, className, children) => (
    <Ui.ContextMenuCheckboxItem key={node.id} className={className} checked={bool(node, "checked")}>
      {children}
    </Ui.ContextMenuCheckboxItem>
  ),
  ContextMenuRadioGroup: (node, _cls, children) => (
    <Ui.ContextMenuRadioGroup key={node.id} value={str(node, "value")}>
      {children}
    </Ui.ContextMenuRadioGroup>
  ),
  ContextMenuRadioItem: (node, className, children) => (
    <Ui.ContextMenuRadioItem key={node.id} className={className} value={str(node, "value") ?? ""}>
      {children}
    </Ui.ContextMenuRadioItem>
  ),
  ContextMenuSub: (node, _cls, children) => (
    <Ui.ContextMenuSub key={node.id}>{children}</Ui.ContextMenuSub>
  ),
  ContextMenuSubTrigger: (node, className, children) => (
    <Ui.ContextMenuSubTrigger key={node.id} className={className} inset={bool(node, "inset")}>
      {children}
    </Ui.ContextMenuSubTrigger>
  ),
  ContextMenuSubContent: simple(Ui.ContextMenuSubContent),
  ContextMenuShortcut: simple(Ui.ContextMenuShortcut),

  // ─── Breadcrumb ───
  Breadcrumb: simple(Ui.Breadcrumb),
  BreadcrumbList: simple(Ui.BreadcrumbList),
  BreadcrumbItem: simple(Ui.BreadcrumbItem),
  BreadcrumbLink: (node, className, children) => (
    <Ui.BreadcrumbLink key={node.id} className={className} href={str(node, "href")}>
      {children}
    </Ui.BreadcrumbLink>
  ),
  BreadcrumbPage: simple(Ui.BreadcrumbPage),
  BreadcrumbSeparator: simple(Ui.BreadcrumbSeparator),
  BreadcrumbEllipsis: (node, className) => (
    <Ui.BreadcrumbEllipsis key={node.id} className={className} />
  ),

  // ─── Collapsible ───
  Collapsible: (node, className, children) => (
    <Ui.Collapsible key={node.id} className={className} defaultOpen={bool(node, "open")}>
      {children}
    </Ui.Collapsible>
  ),
  CollapsibleTrigger: (node, className, children) => (
    <Ui.CollapsibleTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.CollapsibleTrigger>
  ),
  CollapsibleContent: simple(Ui.CollapsibleContent),

  // ─── AspectRatio ───
  AspectRatio: (node, className, children) => (
    <Ui.AspectRatio key={node.id} className={className} ratio={num(node, "ratio")}>
      {children}
    </Ui.AspectRatio>
  ),

  // ─── ButtonGroup ───
  ButtonGroup: (node, className, children) => (
    <Ui.ButtonGroup
      key={node.id}
      className={className}
      orientation={oneOf(node, "orientation", ["horizontal", "vertical"] as const, "horizontal")}
    >
      {children}
    </Ui.ButtonGroup>
  ),
  ButtonGroupSeparator: (node, className) => (
    <Ui.ButtonGroupSeparator key={node.id} className={className} />
  ),
  ButtonGroupText: simple(Ui.ButtonGroupText),

  // ─── Carousel ───
  Carousel: (node, className, children) => (
    <Ui.Carousel
      key={node.id}
      className={className}
      orientation={oneOf(node, "orientation", ["horizontal", "vertical"] as const, "horizontal")}
    >
      {children}
    </Ui.Carousel>
  ),
  CarouselContent: simple(Ui.CarouselContent),
  CarouselItem: simple(Ui.CarouselItem),
  CarouselPrevious: (node, className) => (
    <Ui.CarouselPrevious key={node.id} className={className} />
  ),
  CarouselNext: (node, className) => (
    <Ui.CarouselNext key={node.id} className={className} />
  ),

  // ─── Calendar ───
  Calendar: (node, className) => (
    <Ui.Calendar key={node.id} className={className} />
  ),

  // ─── Field (表单布局) ───
  FieldSet: simple(Ui.FieldSet),
  FieldGroup: simple(Ui.FieldGroup),
  Field: (node, className, children) => (
    <Ui.Field
      key={node.id}
      className={className}
      orientation={oneOf(node, "orientation", ["vertical", "horizontal", "responsive"] as const, "vertical")}
    >
      {children}
    </Ui.Field>
  ),
  FieldLabel: simple(Ui.FieldLabel),
  FieldDescription: simple(Ui.FieldDescription),
  FieldError: simple(Ui.FieldError),
  FieldLegend: (node, className, children) => (
    <Ui.FieldLegend
      key={node.id}
      className={className}
      variant={oneOf(node, "variant", ["legend", "label"] as const, "legend")}
    >
      {children}
    </Ui.FieldLegend>
  ),
  FieldSeparator: simple(Ui.FieldSeparator),
  FieldContent: simple(Ui.FieldContent),
  FieldTitle: simple(Ui.FieldTitle),

  // ─── InputGroup ───
  InputGroup: simple(Ui.InputGroup),
  InputGroupAddon: (node, className, children) => (
    <Ui.InputGroupAddon
      key={node.id}
      className={className}
      align={oneOf(node, "align", ["inline-start", "inline-end", "block-start", "block-end"] as const, "inline-start")}
    >
      {children}
    </Ui.InputGroupAddon>
  ),
  InputGroupInput: (node, className) => (
    <Ui.InputGroupInput key={node.id} className={className} placeholder={str(node, "placeholder")} />
  ),
  InputGroupTextarea: (node, className) => (
    <Ui.InputGroupTextarea key={node.id} className={className} placeholder={str(node, "placeholder")} />
  ),
  InputGroupButton: (node, className, children) => (
    <Ui.InputGroupButton
      key={node.id}
      className={className}
      variant={oneOf(node, "variant", BUTTON_VARIANTS, "ghost")}
    >
      {children}
    </Ui.InputGroupButton>
  ),
  InputGroupText: simple(Ui.InputGroupText),

  // ─── Command ───
  Command: simple(Ui.Command),
  CommandInput: (node, className) => (
    <Ui.CommandInput key={node.id} className={className} placeholder={str(node, "placeholder")} />
  ),
  CommandList: simple(Ui.CommandList),
  CommandEmpty: simple(Ui.CommandEmpty),
  CommandGroup: simple(Ui.CommandGroup),
  CommandItem: (node, className, children) => (
    <Ui.CommandItem key={node.id} className={className} value={str(node, "value")}>
      {children}
    </Ui.CommandItem>
  ),
  CommandSeparator: (node, className) => (
    <Ui.CommandSeparator key={node.id} className={className} />
  ),
  CommandShortcut: simple(Ui.CommandShortcut),

  // ─── Combobox（静态预览，不含交互状态） ───
  Combobox: (node, _cls, children) => (
    <div key={node.id} data-slot="combobox-preview" className="relative">
      {children}
    </div>
  ),
  ComboboxInput: (node, className) => (
    <Ui.Input
      key={node.id}
      className={className}
      placeholder={str(node, "placeholder")}
      readOnly
    />
  ),
  ComboboxContent: (node, className, children) => (
    <div
      key={node.id}
      className={cn("rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)}
    >
      {children}
    </div>
  ),
  ComboboxList: simple("div" as unknown as ComponentType),
  ComboboxItem: (node, className, children) => (
    <div
      key={node.id}
      className={cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm", className)}
    >
      {children}
    </div>
  ),
  ComboboxGroup: simple("div" as unknown as ComponentType),
  ComboboxLabel: (node, className, children) => (
    <div key={node.id} className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}>
      {children}
    </div>
  ),
  ComboboxEmpty: (node, className, children) => (
    <div key={node.id} className={cn("py-2 text-center text-sm text-muted-foreground", className)}>
      {children}
    </div>
  ),
  ComboboxSeparator: (node, className) => (
    <Ui.Separator key={node.id} className={className} />
  ),

  // ─── Chart（静态预览容器） ───
  ChartContainer: (node, className, children) => (
    <div key={node.id} className={cn("flex aspect-video justify-center text-xs", className)}>
      {children.length > 0 ? children : (
        <div className="flex items-center justify-center text-muted-foreground">[Chart Placeholder]</div>
      )}
    </div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
  ChartLegend: () => null,
  ChartLegendContent: () => null,

  // ─── Drawer ───
  Drawer: (node, _cls, children) => (
    <Ui.Drawer key={node.id} defaultOpen>{children}</Ui.Drawer>
  ),
  DrawerTrigger: (node, className, children) => (
    <Ui.DrawerTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.DrawerTrigger>
  ),
  DrawerContent: simple(Ui.DrawerContent),
  DrawerHeader: simple(Ui.DrawerHeader),
  DrawerTitle: simple(Ui.DrawerTitle),
  DrawerDescription: simple(Ui.DrawerDescription),
  DrawerFooter: simple(Ui.DrawerFooter),
  DrawerClose: (node, className, children) => (
    <Ui.DrawerClose key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.DrawerClose>
  ),

  // ─── HoverCard ───
  HoverCard: (node, _cls, children) => (
    <Ui.HoverCard key={node.id}>{children}</Ui.HoverCard>
  ),
  HoverCardTrigger: (node, className, children) => (
    <Ui.HoverCardTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.HoverCardTrigger>
  ),
  HoverCardContent: (node, className, children) => (
    <Ui.HoverCardContent key={node.id} className={className} align={oneOf(node, "align", ["start", "center", "end"] as const, "center")}>
      {children}
    </Ui.HoverCardContent>
  ),

  // ─── InputOTP ───
  InputOTP: (node, className, children) => (
    <Ui.InputOTP key={node.id} className={className} maxLength={num(node, "maxLength") ?? 6} disabled={bool(node, "disabled")}>
      {children}
    </Ui.InputOTP>
  ),
  InputOTPGroup: simple(Ui.InputOTPGroup),
  InputOTPSlot: (node, className) => (
    <Ui.InputOTPSlot key={node.id} className={className} index={num(node, "index") ?? 0} />
  ),
  InputOTPSeparator: simple(Ui.InputOTPSeparator),

  // ─── Kbd ───
  Kbd: simple(Ui.Kbd),
  KbdGroup: simple(Ui.KbdGroup),

  // ─── Menubar ───
  Menubar: simple(Ui.Menubar),
  MenubarMenu: (node, _cls, children) => (
    <Ui.MenubarMenu key={node.id}>{children}</Ui.MenubarMenu>
  ),
  MenubarTrigger: simple(Ui.MenubarTrigger),
  MenubarContent: simple(Ui.MenubarContent),
  MenubarItem: (node, className, children) => (
    <Ui.MenubarItem key={node.id} className={className} inset={bool(node, "inset")} variant={oneOf(node, "variant", ["default", "destructive"] as const, "default")}>
      {children}
    </Ui.MenubarItem>
  ),
  MenubarLabel: (node, className, children) => (
    <Ui.MenubarLabel key={node.id} className={className} inset={bool(node, "inset")}>
      {children}
    </Ui.MenubarLabel>
  ),
  MenubarSeparator: (node, className) => (
    <Ui.MenubarSeparator key={node.id} className={className} />
  ),
  MenubarShortcut: simple(Ui.MenubarShortcut),
  MenubarCheckboxItem: (node, className, children) => (
    <Ui.MenubarCheckboxItem key={node.id} className={className} checked={bool(node, "checked")}>
      {children}
    </Ui.MenubarCheckboxItem>
  ),
  MenubarRadioGroup: (node, _cls, children) => (
    <Ui.MenubarRadioGroup key={node.id} value={str(node, "value")}>
      {children}
    </Ui.MenubarRadioGroup>
  ),
  MenubarRadioItem: (node, className, children) => (
    <Ui.MenubarRadioItem key={node.id} className={className} value={str(node, "value") ?? ""}>
      {children}
    </Ui.MenubarRadioItem>
  ),
  MenubarSub: (node, _cls, children) => (
    <Ui.MenubarSub key={node.id}>{children}</Ui.MenubarSub>
  ),
  MenubarSubTrigger: (node, className, children) => (
    <Ui.MenubarSubTrigger key={node.id} className={className} inset={bool(node, "inset")}>
      {children}
    </Ui.MenubarSubTrigger>
  ),
  MenubarSubContent: simple(Ui.MenubarSubContent),

  // ─── NativeSelect ───
  NativeSelect: (node, className, children) => (
    <Ui.NativeSelect key={node.id} className={className} size={oneOf(node, "size", ["sm", "default"] as const, "default")} disabled={bool(node, "disabled")}>
      {children.length > 0 ? children : <Ui.NativeSelectOption value="">请选择</Ui.NativeSelectOption>}
    </Ui.NativeSelect>
  ),
  NativeSelectOption: (node, className, children) => (
    <Ui.NativeSelectOption key={node.id} className={className} value={str(node, "value") ?? ""} disabled={bool(node, "disabled")}>
      {children.length > 0 ? children : str(node, "label") ?? ""}
    </Ui.NativeSelectOption>
  ),
  NativeSelectOptGroup: (node, className, children) => (
    <Ui.NativeSelectOptGroup key={node.id} className={className} label={str(node, "label") ?? ""}>
      {children}
    </Ui.NativeSelectOptGroup>
  ),

  // ─── NavigationMenu ───
  NavigationMenu: (node, className, children) => (
    <Ui.NavigationMenu key={node.id} className={className}>
      {children}
    </Ui.NavigationMenu>
  ),
  NavigationMenuList: simple(Ui.NavigationMenuList),
  NavigationMenuItem: simple(Ui.NavigationMenuItem),
  NavigationMenuTrigger: simple(Ui.NavigationMenuTrigger),
  NavigationMenuContent: simple(Ui.NavigationMenuContent),
  NavigationMenuLink: (node, className, children) => (
    <Ui.NavigationMenuLink key={node.id} className={className} href={str(node, "href")}>
      {children}
    </Ui.NavigationMenuLink>
  ),
  NavigationMenuIndicator: simple(Ui.NavigationMenuIndicator),

  // ─── Pagination ───
  Pagination: simple(Ui.Pagination),
  PaginationContent: simple(Ui.PaginationContent),
  PaginationItem: simple(Ui.PaginationItem),
  PaginationLink: (node, className, children) => (
    <Ui.PaginationLink key={node.id} className={className} href={str(node, "href")} isActive={bool(node, "isActive")}>
      {children}
    </Ui.PaginationLink>
  ),
  PaginationPrevious: (node, className, children) => (
    <Ui.PaginationPrevious key={node.id} className={className} href={str(node, "href")}>
      {children}
    </Ui.PaginationPrevious>
  ),
  PaginationNext: (node, className, children) => (
    <Ui.PaginationNext key={node.id} className={className} href={str(node, "href")}>
      {children}
    </Ui.PaginationNext>
  ),
  PaginationEllipsis: (node, className) => (
    <Ui.PaginationEllipsis key={node.id} className={className} />
  ),

  // ─── Popover ───
  Popover: (node, _cls, children) => (
    <Ui.Popover key={node.id} defaultOpen>{children}</Ui.Popover>
  ),
  PopoverTrigger: (node, className, children) => (
    <Ui.PopoverTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.PopoverTrigger>
  ),
  PopoverContent: (node, className, children) => (
    <Ui.PopoverContent key={node.id} className={className} align={oneOf(node, "align", ["start", "center", "end"] as const, "center")}>
      {children}
    </Ui.PopoverContent>
  ),
  PopoverHeader: simple(Ui.PopoverHeader),
  PopoverTitle: simple(Ui.PopoverTitle),
  PopoverDescription: simple(Ui.PopoverDescription),

  // ─── Progress ───
  Progress: (node, className) => (
    <Ui.Progress key={node.id} className={className} value={num(node, "value")} />
  ),

  // ─── RadioGroup ───
  RadioGroup: (node, className, children) => (
    <Ui.RadioGroup key={node.id} className={className} value={str(node, "value")}>
      {children}
    </Ui.RadioGroup>
  ),
  RadioGroupItem: (node, className) => (
    <Ui.RadioGroupItem key={node.id} className={className} value={str(node, "value") ?? ""} disabled={bool(node, "disabled")} />
  ),

  // ─── Resizable ───
  ResizablePanelGroup: (node, className, children) => (
    <Ui.ResizablePanelGroup key={node.id} className={className} {...{ direction: oneOf(node, "direction", ["horizontal", "vertical"] as const, "horizontal") }}>
      {children}
    </Ui.ResizablePanelGroup>
  ),
  ResizablePanel: (node, className, children) => (
    <Ui.ResizablePanel key={node.id} className={className} defaultSize={num(node, "defaultSize")}>
      {children}
    </Ui.ResizablePanel>
  ),
  ResizableHandle: (node, className) => (
    <Ui.ResizableHandle key={node.id} className={className} withHandle={bool(node, "withHandle")} />
  ),

  // ─── ScrollArea ───
  ScrollArea: simple(Ui.ScrollArea),
  ScrollBar: (node, className) => (
    <Ui.ScrollBar key={node.id} className={className} orientation={oneOf(node, "orientation", ["vertical", "horizontal"] as const, "vertical")} />
  ),

  // ─── Select ───
  Select: (node, _cls, children) => (
    <Ui.Select key={node.id} defaultValue={str(node, "defaultValue")}>{children}</Ui.Select>
  ),
  SelectTrigger: (node, className, children) => (
    <Ui.SelectTrigger key={node.id} className={className} size={oneOf(node, "size", ["sm", "default"] as const, "default")}>
      {children}
    </Ui.SelectTrigger>
  ),
  SelectValue: (node) => (
    <Ui.SelectValue key={node.id} placeholder={str(node, "placeholder")} />
  ),
  SelectContent: simple(Ui.SelectContent),
  SelectItem: (node, className, children) => (
    <Ui.SelectItem key={node.id} className={className} value={str(node, "value") ?? ""}>
      {children}
    </Ui.SelectItem>
  ),
  SelectGroup: simple(Ui.SelectGroup),
  SelectLabel: simple(Ui.SelectLabel),
  SelectSeparator: (node, className) => (
    <Ui.SelectSeparator key={node.id} className={className} />
  ),

  // ─── Sheet ───
  Sheet: (node, _cls, children) => (
    <Ui.Sheet key={node.id} defaultOpen>{children}</Ui.Sheet>
  ),
  SheetTrigger: (node, className, children) => (
    <Ui.SheetTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.SheetTrigger>
  ),
  SheetContent: (node, className, children) => (
    <Ui.SheetContent key={node.id} className={className} side={oneOf(node, "side", ["top", "right", "bottom", "left"] as const, "right")} showCloseButton={bool(node, "showCloseButton") ?? true}>
      {children}
    </Ui.SheetContent>
  ),
  SheetHeader: simple(Ui.SheetHeader),
  SheetTitle: simple(Ui.SheetTitle),
  SheetDescription: simple(Ui.SheetDescription),
  SheetFooter: simple(Ui.SheetFooter),
  SheetClose: (node, className, children) => (
    <Ui.SheetClose key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.SheetClose>
  ),

  // ─── Sidebar（简化预览，不包含完整交互） ───
  SidebarProvider: (node, className, children) => (
    <div key={node.id} data-slot="sidebar-provider" className={className}>
      {children}
    </div>
  ),
  Sidebar: (node, className, children) => (
    <div key={node.id} data-slot="sidebar" className={cn("flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r", className)}>
      {children}
    </div>
  ),
  SidebarHeader: simple(Ui.SidebarHeader),
  SidebarContent: simple(Ui.SidebarContent),
  SidebarFooter: simple(Ui.SidebarFooter),
  SidebarTrigger: simple(Ui.SidebarTrigger),
  SidebarRail: simple(Ui.SidebarRail),
  SidebarInset: simple(Ui.SidebarInset),
  SidebarInput: (node, className) => (
    <Ui.SidebarInput key={node.id} className={className} placeholder={str(node, "placeholder")} />
  ),
  SidebarSeparator: simple(Ui.SidebarSeparator),
  SidebarGroup: simple(Ui.SidebarGroup),
  SidebarGroupLabel: simple(Ui.SidebarGroupLabel),
  SidebarGroupContent: simple(Ui.SidebarGroupContent),
  SidebarGroupAction: simple(Ui.SidebarGroupAction),
  SidebarMenu: simple(Ui.SidebarMenu),
  SidebarMenuItem: simple(Ui.SidebarMenuItem),
  SidebarMenuButton: (node, className, children) => (
    <Ui.SidebarMenuButton key={node.id} className={className} isActive={bool(node, "isActive")} variant={oneOf(node, "variant", ["default", "outline"] as const, "default")} size={oneOf(node, "size", ["default", "sm", "lg"] as const, "default")}>
      {children}
    </Ui.SidebarMenuButton>
  ),
  SidebarMenuAction: (node, className, children) => (
    <Ui.SidebarMenuAction key={node.id} className={className} showOnHover={bool(node, "showOnHover")}>
      {children}
    </Ui.SidebarMenuAction>
  ),
  SidebarMenuBadge: simple(Ui.SidebarMenuBadge),
  SidebarMenuSub: simple(Ui.SidebarMenuSub),
  SidebarMenuSubItem: simple(Ui.SidebarMenuSubItem),
  SidebarMenuSubButton: (node, className, children) => (
    <Ui.SidebarMenuSubButton key={node.id} className={className} isActive={bool(node, "isActive")} size={oneOf(node, "size", ["sm", "md"] as const, "md")}>
      {children}
    </Ui.SidebarMenuSubButton>
  ),

  // ─── Skeleton ───
  Skeleton: simple(Ui.Skeleton),

  // ─── Slider ───
  Slider: (node, className) => (
    <Ui.Slider key={node.id} className={className} defaultValue={node.props?.defaultValue as number[] | undefined} max={num(node, "max")} min={num(node, "min")} step={num(node, "step")} disabled={bool(node, "disabled")} />
  ),

  // ─── Spinner ───
  Spinner: simple(Ui.Spinner),

  // ─── Switch ───
  Switch: (node, className) => (
    <Ui.Switch key={node.id} className={className} checked={bool(node, "checked")} disabled={bool(node, "disabled")} size={oneOf(node, "size", ["sm", "default"] as const, "default")} />
  ),

  // ─── Tabs ───
  Tabs: (node, className, children) => (
    <Ui.Tabs key={node.id} className={className} defaultValue={str(node, "defaultValue")}>
      {children}
    </Ui.Tabs>
  ),
  TabsList: (node, className, children) => (
    <Ui.TabsList key={node.id} className={className} variant={oneOf(node, "variant", ["default", "line"] as const, "default")}>
      {children}
    </Ui.TabsList>
  ),
  TabsTrigger: (node, className, children) => (
    <Ui.TabsTrigger key={node.id} className={className} value={str(node, "value") ?? ""} disabled={bool(node, "disabled")}>
      {children}
    </Ui.TabsTrigger>
  ),
  TabsContent: (node, className, children) => (
    <Ui.TabsContent key={node.id} className={className} value={str(node, "value") ?? ""}>
      {children}
    </Ui.TabsContent>
  ),

  // ─── Toggle ───
  Toggle: (node, className, children) => (
    <Ui.Toggle key={node.id} className={className} pressed={bool(node, "pressed")} disabled={bool(node, "disabled")} variant={oneOf(node, "variant", ["default", "outline"] as const, "default")} size={oneOf(node, "size", ["default", "sm", "lg"] as const, "default")}>
      {children}
    </Ui.Toggle>
  ),

  // ─── ToggleGroup ───
  ToggleGroup: (node, className, children) => (
    <Ui.ToggleGroup key={node.id} className={className} type={oneOf(node, "type", ["single", "multiple"] as const, "single")} variant={oneOf(node, "variant", ["default", "outline"] as const, "default")} size={oneOf(node, "size", ["default", "sm", "lg"] as const, "default")}>
      {children}
    </Ui.ToggleGroup>
  ),
  ToggleGroupItem: (node, className, children) => (
    <Ui.ToggleGroupItem key={node.id} className={className} value={str(node, "value") ?? ""} disabled={bool(node, "disabled")}>
      {children}
    </Ui.ToggleGroupItem>
  ),

  // ─── Tooltip ───
  TooltipProvider: (node, _cls, children) => (
    <Ui.TooltipProvider key={node.id} delayDuration={num(node, "delayDuration") ?? 0}>
      {children}
    </Ui.TooltipProvider>
  ),
  Tooltip: (node, _cls, children) => (
    <Ui.Tooltip key={node.id}>{children}</Ui.Tooltip>
  ),
  TooltipTrigger: (node, className, children) => (
    <Ui.TooltipTrigger key={node.id} className={className} asChild={bool(node, "asChild")}>
      {children.length === 1 ? children[0] : <span>{children}</span>}
    </Ui.TooltipTrigger>
  ),
  TooltipContent: (node, className, children) => (
    <Ui.TooltipContent key={node.id} className={className} side={oneOf(node, "side", ["top", "right", "bottom", "left"] as const, "top")} sideOffset={num(node, "sideOffset")}>
      {children}
    </Ui.TooltipContent>
  ),

  // ─── Empty ───
  Empty: simple(Ui.Empty),
  EmptyHeader: simple(Ui.EmptyHeader),
  EmptyMedia: (node, className, children) => (
    <Ui.EmptyMedia key={node.id} className={className} variant={oneOf(node, "variant", ["default", "icon"] as const, "default")}>
      {children}
    </Ui.EmptyMedia>
  ),
  EmptyTitle: simple(Ui.EmptyTitle),
  EmptyDescription: simple(Ui.EmptyDescription),
  EmptyContent: simple(Ui.EmptyContent),

  // ─── Item ───
  ItemGroup: simple(Ui.ItemGroup),
  Item: (node, className, children) => (
    <Ui.Item key={node.id} className={className} variant={oneOf(node, "variant", ["default", "outline", "muted"] as const, "default")} size={oneOf(node, "size", ["default", "sm"] as const, "default")}>
      {children}
    </Ui.Item>
  ),
  ItemMedia: (node, className, children) => (
    <Ui.ItemMedia key={node.id} className={className} variant={oneOf(node, "variant", ["default", "icon", "image"] as const, "default")}>
      {children}
    </Ui.ItemMedia>
  ),
  ItemContent: simple(Ui.ItemContent),
  ItemTitle: simple(Ui.ItemTitle),
  ItemDescription: simple(Ui.ItemDescription),
  ItemActions: simple(Ui.ItemActions),
  ItemSeparator: simple(Ui.ItemSeparator),
  ItemHeader: simple(Ui.ItemHeader),
  ItemFooter: simple(Ui.ItemFooter),

  // ─── Toaster ───
  Toaster: () => <Ui.Toaster key="toaster" />,
}

// ── 渲染引擎 ──

function renderNode(
  node: UiTreeNode,
  styleClassById: Record<string, string>,
): ReactNode {
  const fromTree = str(node, "className")
  const fromStyle = styleClassById[node.id]
  const className = fromTree && fromStyle ? cn(fromTree, fromStyle) : (fromStyle ?? fromTree ?? undefined)

  const children = getNodeChildren(node).map((child) => renderNode(child, styleClassById))

  const renderFn = registry[node.type]
  if (renderFn) {
    return renderFn(node, className, children)
  }

  return (
    <div
      key={node.id}
      className="rounded-md border border-dashed p-3 text-xs text-muted-foreground"
    >
      Unsupported: {node.type} ({node.id})
      {children.length > 0 && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

// ── 对外导出 ──

export { isUiTreeNode, collectIds, getNodeChildren, renderNode }
export type { UiTreeNode, StructureOutput, StyleOutput }

export function ThreeOutputPreviewCard({
  structureOutput,
  styleOutput,
}: ThreeOutputPreviewCardProps) {
  let parsedTree: UiTreeNode | null = null
  let treeIds: string[] = []
  let missingStyleIds: string[] = []
  let extraStyleIds: string[] = []
  let duplicatedIds: string[] = []

  try {
    const rawTree = JSON.parse(structureOutput.uiTree) as unknown
    parsedTree = isUiTreeNode(rawTree) ? rawTree : null

    if (!parsedTree) {
      throw new Error("Invalid uiTree shape")
    }

    treeIds = collectIds(parsedTree)
    duplicatedIds = [...new Set(treeIds.filter((id, i) => treeIds.indexOf(id) !== i))]

    const treeSet = new Set(treeIds)
    const styleSet = new Set(styleOutput.styles.map((s) => s.id))

    missingStyleIds = treeIds.filter((id) => !styleSet.has(id))
    extraStyleIds = styleOutput.styles.map((s) => s.id).filter((id) => !treeSet.has(id))
  } catch {
    parsedTree = null
  }

  const styleClassById = Object.fromEntries(
    styleOutput.styles.map((s) => [s.id, s.className]),
  )

  return (
    <Ui.Card className="border-slate-300 bg-slate-50 md:col-span-2">
      <Ui.CardHeader>
        <Ui.CardTitle>Multi-Agent Mock Test（本页内测试）</Ui.CardTitle>
        <Ui.CardDescription>验证 admin/structure/style 三段输出是否可解析、可对齐。</Ui.CardDescription>
      </Ui.CardHeader>
      <Ui.CardContent>
        <div className="space-y-4">

          <div className="rounded-md border bg-white p-3 space-y-2">
            <p className="text-sm font-medium text-slate-900">structure.uiTree 解析结果</p>
            <p className="text-sm text-slate-700">解析状态: {parsedTree ? "成功" : "失败"}</p>
            <p className="text-sm text-slate-700">节点数: {treeIds.length}</p>
            <p className="text-xs text-slate-600 break-all">IDs: {treeIds.join(", ") || "-"}</p>
            <p className="text-sm text-rose-700">重复 ID: {duplicatedIds.length ? duplicatedIds.join(", ") : "无"}</p>
          </div>

          <div className="rounded-md border bg-white p-3 space-y-2">
            <p className="text-sm font-medium text-slate-900">style 覆盖检查</p>
            <p className="text-sm text-slate-700">styles 条数: {styleOutput.styles.length}</p>
            <p className="text-sm text-emerald-700">缺失样式 ID: {missingStyleIds.length ? missingStyleIds.join(", ") : "无"}</p>
            <p className="text-sm text-amber-700">多余样式 ID: {extraStyleIds.length ? extraStyleIds.join(", ") : "无"}</p>
          </div>

          <div className="rounded-md border bg-white p-3 space-y-3">
            <p className="text-sm font-medium text-slate-900">按 uiTree + styles 渲染预览</p>
            {parsedTree ? (
              <div className="space-y-3">{renderNode(parsedTree, styleClassById)}</div>
            ) : (
              <p className="text-sm text-red-600">uiTree 解析失败，无法渲染。</p>
            )}
          </div>
        </div>
      </Ui.CardContent>
    </Ui.Card>
  )
}
