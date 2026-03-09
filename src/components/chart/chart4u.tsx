"use client"

import * as React from "react"

import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	RechartsPrimitive,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart"

type Chart4uSeries = {
	key?: string
	type?: "bar" | "line" | "area"
	dataKey: string
	stackId?: string
	strokeWidth?: number
}

/** Chart4u 组件参数：配置数据源、坐标字段、序列与图表行为。 */
export interface Chart4uProps {
	className?: string
	data: Record<string, string | number>[]
	config: ChartConfig
	xAxisDataKey: string
	series: Chart4uSeries[]
	showGrid?: boolean
	showLegend?: boolean
	showTooltip?: boolean
	containerProps?: Omit<React.ComponentProps<typeof ChartContainer>, "children" | "config">
	composedChartProps?: Omit<React.ComponentProps<typeof RechartsPrimitive.ComposedChart>, "data" | "children">
}

export function Chart4u({
	className,
	data,
	config,
	xAxisDataKey,
	series,
	showGrid = true,
	showLegend = true,
	showTooltip = true,
	containerProps,
	composedChartProps,
}: Chart4uProps) {
	return (
		<ChartContainer className={className} config={config} {...containerProps}>
			<RechartsPrimitive.ComposedChart data={data} {...composedChartProps}>
				{showGrid && <RechartsPrimitive.CartesianGrid vertical={false} />}
				<RechartsPrimitive.XAxis
					dataKey={xAxisDataKey}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
				/>

				{showTooltip && (
					<ChartTooltip
						cursor={false}
						content={<ChartTooltipContent indicator="line" />}
					/>
				)}

				{showLegend && (
					<ChartLegend
						content={<ChartLegendContent payload={[]} verticalAlign="bottom" />}
					/>
				)}

				{series.map((item, index) => {
					const seriesType = item.type ?? "bar"
					const color = `var(--color-${item.dataKey})`
					const key = item.key ?? `${item.dataKey}-${seriesType}-${index}`

					if (seriesType === "line") {
						return (
							<RechartsPrimitive.Line
								key={key}
								dataKey={item.dataKey}
								stroke={color}
								strokeWidth={item.strokeWidth ?? 2}
								dot={false}
								type="monotone"
							/>
						)
					}

					if (seriesType === "area") {
						return (
							<RechartsPrimitive.Area
								key={key}
								dataKey={item.dataKey}
								stroke={color}
								fill={color}
								fillOpacity={0.2}
								strokeWidth={item.strokeWidth ?? 2}
								type="monotone"
							/>
						)
					}

					return (
						<RechartsPrimitive.Bar
							key={key}
							dataKey={item.dataKey}
							fill={color}
							stackId={item.stackId}
							radius={4}
						/>
					)
				})}
			</RechartsPrimitive.ComposedChart>
		</ChartContainer>
	)
}
