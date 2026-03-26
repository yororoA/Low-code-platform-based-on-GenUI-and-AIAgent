import type { ReactNode } from "react"
import Image from "next/image"

import {
  Accordion as UiAccordion,
  AccordionContent as UiAccordionContent,
  AccordionItem as UiAccordionItem,
  AccordionTrigger as UiAccordionTrigger,
} from "@/components/ui/accordion"
import {
  Avatar as UiAvatar,
  AvatarFallback as UiAvatarFallback,
  AvatarImage as UiAvatarImage,
} from "@/components/ui/avatar"
import { Button as UiButton } from "@/components/ui/button"
import {
  Card as UiCard,
  CardContent as UiCardContent,
  CardDescription as UiCardDescription,
  CardFooter as UiCardFooter,
  CardHeader as UiCardHeader,
  CardTitle as UiCardTitle,
} from "@/components/ui/card"
import { Label as UiLabel } from "@/components/ui/label"
import { Separator as UiSeparator } from "@/components/ui/separator"

type UiTreeNode = {
  type: string
  id: string
  props?: Record<string, unknown>
  children?: UiTreeNode[]
}

type AdminOutput = {
  necessary: boolean
  uiDescription: string
  uiNeeds: string[]
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
  adminOutput: AdminOutput
  structureOutput: StructureOutput
  styleOutput: StyleOutput
}

function isUiTreeNode(value: unknown): value is UiTreeNode {
  if (!value || typeof value !== "object") return false
  const maybeNode = value as Partial<UiTreeNode>
  if (typeof maybeNode.type !== "string" || typeof maybeNode.id !== "string") return false
  if (maybeNode.children === undefined) return true
  if (!Array.isArray(maybeNode.children)) return false
  return maybeNode.children.every(isUiTreeNode)
}

function toUiTreeNodes(value: unknown): UiTreeNode[] {
  if (isUiTreeNode(value)) return [value]
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => (isUiTreeNode(item) ? [item] : []))
}

function getNodeChildren(node: UiTreeNode): UiTreeNode[] {
  const fromChildren = node.children ?? []
  const fromContent = toUiTreeNodes(node.props?.content)
  const fromPropsChildren = toUiTreeNodes(node.props?.children)

  const merged = [...fromChildren, ...fromContent, ...fromPropsChildren]
  const deduped = new Map<string, UiTreeNode>()
  for (const child of merged) {
    if (!deduped.has(child.id)) deduped.set(child.id, child)
  }
  return [...deduped.values()]
}

function collectIds(node: UiTreeNode): string[] {
  const current = [node.id]
  const children = getNodeChildren(node).flatMap(collectIds)
  return [...current, ...children]
}

function readStringProp(node: UiTreeNode, key: string): string | undefined {
  const value = node.props?.[key]
  return typeof value === "string" ? value : undefined
}

function readBooleanProp(node: UiTreeNode, key: string): boolean | undefined {
  const value = node.props?.[key]
  return typeof value === "boolean" ? value : undefined
}

function readOrientationProp(node: UiTreeNode): "horizontal" | "vertical" | undefined {
  const value = node.props?.orientation
  return value === "horizontal" || value === "vertical" ? value : undefined
}

function readAccordionTypeProp(node: UiTreeNode): "single" | "multiple" {
  const value = readStringProp(node, "type")
  return value === "multiple" ? "multiple" : "single"
}

function readButtonVariantProp(node: UiTreeNode): React.ComponentProps<typeof UiButton>["variant"] {
  const value = readStringProp(node, "variant")
  if (
    value === "default" ||
    value === "destructive" ||
    value === "outline" ||
    value === "secondary" ||
    value === "ghost" ||
    value === "link"
  ) {
    return value
  }
  return "default"
}

function readButtonSizeProp(node: UiTreeNode): React.ComponentProps<typeof UiButton>["size"] {
  const value = readStringProp(node, "size")
  if (
    value === "default" ||
    value === "xs" ||
    value === "sm" ||
    value === "lg" ||
    value === "icon" ||
    value === "icon-xs" ||
    value === "icon-sm" ||
    value === "icon-lg"
  ) {
    return value
  }
  return "default"
}

export function ThreeOutputPreviewCard({
  adminOutput,
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
    duplicatedIds = [...new Set(treeIds.filter((id, index) => treeIds.indexOf(id) !== index))]

    const treeSet = new Set(treeIds)
    const styleSet = new Set(styleOutput.styles.map((item) => item.id))

    missingStyleIds = treeIds.filter((id) => !styleSet.has(id))
    extraStyleIds = styleOutput.styles
      .map((item) => item.id)
      .filter((id) => !treeSet.has(id))
  } catch {
    parsedTree = null
  }

  const styleClassById = Object.fromEntries(
    styleOutput.styles.map((item) => [item.id, item.className]),
  )

  const getMergedClassName = (node: UiTreeNode) => {
    const fromTree = readStringProp(node, "className")
    const fromStyle = styleClassById[node.id]
    return fromStyle || fromTree || undefined
  }

  const renderMockNode = (node: UiTreeNode): ReactNode => {
    const className = getMergedClassName(node)
    const children = getNodeChildren(node).map((child) => renderMockNode(child))

    switch (node.type) {
      case "Card":
        return (
          <UiCard key={node.id} className={className}>
            {children}
          </UiCard>
        )

      case "CardHeader":
        return (
          <UiCardHeader key={node.id} className={className}>
            {children}
          </UiCardHeader>
        )

      case "CardTitle":
        return (
          <UiCardTitle key={node.id} className={className}>
            {children}
          </UiCardTitle>
        )

      case "CardDescription":
        return (
          <UiCardDescription key={node.id} className={className}>
            {children}
          </UiCardDescription>
        )

      case "CardContent":
        return (
          <UiCardContent key={node.id} className={className}>
            {children}
          </UiCardContent>
        )

      case "CardFooter":
        return (
          <UiCardFooter key={node.id} className={className}>
            {children}
          </UiCardFooter>
        )

      case "Button":
        return (
          <UiButton
            key={node.id}
            className={className}
            variant={readButtonVariantProp(node)}
            size={readButtonSizeProp(node)}
          >
            {children}
          </UiButton>
        )

      case "Label":
        return (
          <UiLabel key={node.id} className={className}>
            {children}
          </UiLabel>
        )

      case "Separator":
        return (
          <UiSeparator
            key={node.id}
            className={className}
            orientation={readOrientationProp(node)}
          />
        )

      case "Accordion":
        return (
          <UiAccordion
            key={node.id}
            className={className}
            type={readAccordionTypeProp(node)}
            collapsible={readBooleanProp(node, "collapsible")}
          >
            {children}
          </UiAccordion>
        )

      case "AccordionItem":
        return (
          <UiAccordionItem
            key={node.id}
            className={className}
            value={readStringProp(node, "value") ?? node.id}
          >
            {children}
          </UiAccordionItem>
        )

      case "AccordionTrigger":
        return (
          <UiAccordionTrigger key={node.id} className={className}>
            {children}
          </UiAccordionTrigger>
        )

      case "AccordionContent":
        return (
          <UiAccordionContent key={node.id} className={className}>
            {children}
          </UiAccordionContent>
        )

      case "Avatar":
        return (
          <UiAvatar key={node.id} className={className}>
            {children}
          </UiAvatar>
        )

      case "AvatarImage":
        return (
          <UiAvatarImage
            key={node.id}
            src={readStringProp(node, "src")}
            alt={readStringProp(node, "alt")}
          />
        )

      case "AvatarFallback":
        return (
          <UiAvatarFallback key={node.id} className={className}>
            {children}
          </UiAvatarFallback>
        )

      case "div":
        return (
          <div key={node.id} className={className}>
            {children}
          </div>
        )

      case "span":
        return (
          <span key={node.id} className={className}>
            {children}
          </span>
        )

      case "img":
        return (
          <Image
            key={node.id}
            className={className}
            src={readStringProp(node, "src") ?? "/next.svg"}
            alt={readStringProp(node, "alt") ?? ""}
            width={160}
            height={160}
            unoptimized
          />
        )

      case "text": {
        const textContent = readStringProp(node, "content") ?? ""
        return (
          <span key={node.id} className={className}>
            {textContent}
          </span>
        )
      }

      default:
        return (
          <div key={node.id} className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Unsupported node type: {node.type} ({node.id})
            {children && children.length > 0 ? <div className="mt-2 space-y-2">{children}</div> : null}
          </div>
        )
    }
  }

  return (
    <UiCard className="border-slate-300 bg-slate-50 md:col-span-2">
      <UiCardHeader>
        <UiCardTitle>Multi-Agent Mock Test（本页内测试）</UiCardTitle>
        <UiCardDescription>验证 admin/structure/style 三段输出是否可解析、可对齐。</UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <div className="space-y-4">
          <div className="rounded-md border bg-white p-3">
            <p className="text-sm font-medium text-slate-900">admin.necessary: {String(adminOutput.necessary)}</p>
            <p className="mt-2 text-sm text-slate-700">uiNeeds: {adminOutput.uiNeeds.join(", ")}</p>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{adminOutput.uiDescription}</p>
          </div>

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
              <div className="space-y-3">{renderMockNode(parsedTree)}</div>
            ) : (
              <p className="text-sm text-red-600">uiTree 解析失败，无法渲染。</p>
            )}
          </div>
        </div>
      </UiCardContent>
    </UiCard>
  )
}
