import type { ReactNode } from "react"

import { Alert4u } from "@/components/alert/alert4u"
import { CalendarSingle } from "@/components/calendar/calendarSingle"
import { Card4u } from "@/components/card/card4u"
import { Chart4u } from "@/components/chart/chart4u"
import { Dropdown4u } from "@/components/dropdown/dropdown4u"
import { Field4u } from "@/components/field/field4u"
import { Label4u } from "@/components/label/label4u"
import { Separator4u } from "@/components/separator/separator4u"
import { Table4u } from "@/components/table/table4u"

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
  }>
}

type ChartItem = {
  month: string
  desktop: number
  mobile: number
}

type ThreeOutputPreviewCardProps = {
  adminOutput: AdminOutput
  structureOutput: StructureOutput
  styleOutput: StyleOutput
  chartData: ChartItem[]
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

function readOrientationProp(node: UiTreeNode): "horizontal" | "vertical" | undefined {
  const value = node.props?.orientation
  return value === "horizontal" || value === "vertical" ? value : undefined
}

function readBooleanProp(node: UiTreeNode, key: string): boolean | undefined {
  const value = node.props?.[key]
  return typeof value === "boolean" ? value : undefined
}

function readCaptionLayoutProp(node: UiTreeNode): "label" | "dropdown" | "dropdown-months" | "dropdown-years" | undefined {
  const value = readStringProp(node, "captionLayout")
  return value === "label" || value === "dropdown" || value === "dropdown-months" || value === "dropdown-years"
    ? value
    : undefined
}

export function ThreeOutputPreviewCard({
  adminOutput,
  structureOutput,
  styleOutput,
  chartData,
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
    return [fromTree, fromStyle].filter(Boolean).join(" ")
  }

  const findChildByType = (node: UiTreeNode, type: string) =>
    node.children?.find((child) => child.type === type)

  const findChildById = (node: UiTreeNode, id: string) =>
    node.children?.find((child) => child.id === id)

  const resolveTableHeaders = (node: UiTreeNode) => {
    const thead = findChildByType(node, "thead") ?? findChildById(node, "table-header")
    const headerRow = thead?.children?.find((child) => child.type === "tr")
    const headerCells = headerRow?.children?.filter((child) => child.type === "th" || child.type === "td") ?? []
    const headerClassName = thead ? getMergedClassName(thead) : undefined

    return headerCells.length > 0
      ? headerCells.map((cell) => ({
          description: readStringProp(cell, "text") ?? cell.id,
          className: getMergedClassName(cell),
        }))
      : [
          { description: "类别", className: headerClassName },
          { description: "详情", className: headerClassName },
        ]
  }

  const resolveTableRows = (node: UiTreeNode) => {
    const tbody = findChildByType(node, "tbody") ?? findChildById(node, "table-body")
    const rowNodes = tbody?.children?.filter((child) => child.type === "tr") ?? []
    const rowClassName = tbody ? getMergedClassName(tbody) : undefined

    return rowNodes.length > 0
      ? rowNodes.map((rowNode) => {
          const cells = rowNode.children?.filter((cell) => cell.type === "td" || cell.type === "th") ?? []
          return {
            key: rowNode.id,
            className: getMergedClassName(rowNode),
            cells: cells.map((cell) => ({
              content: readStringProp(cell, "text") ?? "-",
              className: getMergedClassName(cell),
            })),
          }
        })
      : [
          {
            className: rowClassName,
            cells: [
              { content: "宜" },
              { content: "祭祀、祈福、出行" },
            ],
          },
          {
            className: rowClassName,
            cells: [
              { content: "忌" },
              { content: "动土、安葬" },
            ],
          },
          {
            className: rowClassName,
            cells: [
              { content: "节气" },
              { content: "春分" },
            ],
          },
          {
            className: rowClassName,
            cells: [
              { content: "吉时" },
              { content: "辰时、午时、酉时" },
            ],
          },
        ]
  }

  const resolveTableFooter = (node: UiTreeNode) => {
    const footerText = readStringProp(node, "footer")
    const tfoot = findChildByType(node, "tfoot") ?? findChildById(node, "table-footer")
    const footerClassName = tfoot ? getMergedClassName(tfoot) : undefined

    if (footerText) {
      return {
        className: footerClassName,
        cells: [{ content: "汇总" }, { content: footerText }],
      }
    }

    if (tfoot) {
      return {
        className: footerClassName,
        cells: [{ content: "备注" }, { content: "以当日黄历为准" }],
      }
    }

    return undefined
  }

  const renderMockNode = (node: UiTreeNode): ReactNode => {
    const className = getMergedClassName(node)
    const children = getNodeChildren(node).map((child) => renderMockNode(child))

    switch (node.type) {
      case "Card4u": {
        const title = readStringProp(node, "title")
        const description = readStringProp(node, "description")

        if (title || description) {
          return (
            <Card4u
              key={node.id}
              className={className}
              title={title}
              description={description}
              content={<div className="space-y-3">{children}</div>}
              showDefaultFooterButton={false}
            />
          )
        }

        return (
          <Card4u key={node.id} className={className} showDefaultFooterButton={false}>
            {children}
          </Card4u>
        )
      }

      case "Chart4u":
        return (
          <Chart4u
            key={node.id}
            className={className}
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
        )

      case "Label4u":
        return (
          <Label4u
            key={node.id}
            className={className}
            text={readStringProp(node, "text") ?? node.id}
          />
        )

      case "Separator4u":
        return (
          <Separator4u
            key={node.id}
            className={className}
            label={readStringProp(node, "text") || undefined}
            separatorProps={{ orientation: readOrientationProp(node) }}
          />
        )

      case "Field4u":
        return (
          <Field4u
            key={node.id}
            className={className}
            items={[
              {
                id: node.id,
                label: readStringProp(node, "label") ?? "字段",
                description: readStringProp(node, "description"),
                control: (
                  <input
                    id={node.id}
                    className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                    placeholder={readStringProp(node, "label") ?? "请输入"}
                  />
                ),
              },
            ]}
          />
        )

      case "Dropdown4u":
        return (
          <Dropdown4u
            key={node.id}
            triggerText={readStringProp(node, "placeholder") ?? "更多筛选"}
            contentClassName={className}
            groups={[
              {
                label: "筛选项",
                items: [
                  { type: "item", label: "近7天" },
                  { type: "item", label: "近30天" },
                  { type: "item", label: "全部" },
                ],
              },
            ]}
          />
        )

      case "Table4u": {
        const tableHeaders = resolveTableHeaders(node)
        const tableRows = resolveTableRows(node)
        const tableFooter = resolveTableFooter(node)

        return (
          <Table4u
            key={node.id}
            className={className}
            captionTitle={readStringProp(node, "caption") ?? "数据表"}
            headers={tableHeaders}
            rows={tableRows}
            footer={tableFooter}
          />
        )
      }

      case "CalendarSingle":
        return (
          <CalendarSingle
            key={node.id}
            className={className}
            showOutsideDays={readBooleanProp(node, "showOutsideDays")}
            captionLayout={readCaptionLayoutProp(node)}
            buttonVariant={readStringProp(node, "buttonVariant") as "default" | "outline" | "ghost" | undefined}
            classNames={typeof node.props?.classNames === "object" ? (node.props?.classNames as NonNullable<React.ComponentProps<typeof CalendarSingle>["classNames"]>) : undefined}
          />
        )

      case "div":
        return (
          <div key={node.id} className={className}>
            {children}
          </div>
        )

      case "text": {
        const textContent = readStringProp(node, "content") ?? ""
        return (
          <span key={node.id} className={className}>
            {textContent}
          </span>
        )
      }

      case "Alert4u":
        return (
          <Alert4u
            key={node.id}
            className={className}
            title={readStringProp(node, "title") ?? "预警"}
            description={readStringProp(node, "description") ?? "请关注该项异常数据"}
          />
        )

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
    <Card4u
      className="border-slate-300 bg-slate-50 md:col-span-2"
      title="Multi-Agent Mock Test（本页内测试）"
      description="验证 admin/structure/style 三段输出是否可解析、可对齐。"
      content={
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
      }
      showDefaultFooterButton={false}
    />
  )
}
