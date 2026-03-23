import type { ReactNode } from "react"

import { Alert4u } from "@/components/alert/alert4u"
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

function collectIds(node: UiTreeNode): string[] {
  const current = [node.id]
  const children = node.children?.flatMap(collectIds) ?? []
  return [...current, ...children]
}

function readStringProp(node: UiTreeNode, key: string): string | undefined {
  const value = node.props?.[key]
  return typeof value === "string" ? value : undefined
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

  const renderMockNode = (node: UiTreeNode): ReactNode => {
    const className = getMergedClassName(node)
    const children = node.children?.map((child) => renderMockNode(child))

    switch (node.type) {
      case "Card4u":
        return (
          <Card4u
            key={node.id}
            className={className}
            title={readStringProp(node, "title") ?? node.id}
            description={readStringProp(node, "description")}
            content={<div className="space-y-3">{children}</div>}
            showDefaultFooterButton={false}
          />
        )

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

      case "Table4u":
        return (
          <Table4u
            key={node.id}
            className={className}
            captionTitle={readStringProp(node, "caption") ?? "数据表"}
            headers={[
              { description: "订单号" },
              { description: "状态" },
              { description: "金额", className: "text-right" },
            ]}
            rows={[
              { cells: [{ content: "ORD-001" }, { content: "已支付" }, { content: "¥1200", className: "text-right" }] },
              { cells: [{ content: "ORD-002" }, { content: "待支付" }, { content: "¥560", className: "text-right" }] },
            ]}
            footer={{
              cells: [
                { content: "汇总" },
                { content: "" },
                { content: readStringProp(node, "footer") ?? "总计", className: "text-right" },
              ],
            }}
          />
        )

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
