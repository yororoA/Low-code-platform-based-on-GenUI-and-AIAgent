import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuCheckboxItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type Dropdown4uSeparatorNode = {
  type: "separator"
  key?: string
  className?: string
}

type Dropdown4uItemNode = {
  type: "item"
  key?: string
  label: React.ReactNode
  icon?: React.ReactNode
  className?: string
  disabled?: boolean
  variant?: React.ComponentProps<typeof DropdownMenuItem>["variant"]
  shortcut?: React.ReactNode
  onSelect?: React.ComponentProps<typeof DropdownMenuItem>["onSelect"]
}

type Dropdown4uCheckboxNode = {
  type: "checkbox"
  key?: string
  label: React.ReactNode
  icon?: React.ReactNode
  className?: string
  checked: React.ComponentProps<typeof DropdownMenuCheckboxItem>["checked"]
  onCheckedChange?: React.ComponentProps<typeof DropdownMenuCheckboxItem>["onCheckedChange"]
  disabled?: boolean
  shortcut?: React.ReactNode
}

/** 单个单选项节点配置。 */
export interface Dropdown4uRadioItemNode {
  key?: string
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  className?: string
  disabled?: boolean
}

type Dropdown4uRadioGroupNode = {
  type: "radio-group"
  key?: string
  className?: string
  value: string
  onValueChange?: React.ComponentProps<typeof DropdownMenuRadioGroup>["onValueChange"]
  items: Dropdown4uRadioItemNode[]
}

type Dropdown4uSubNode = {
  type: "sub"
  key?: string
  trigger: React.ReactNode
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
  items: Dropdown4uNode[]
}

export type Dropdown4uNode =
  | Dropdown4uItemNode
  | Dropdown4uCheckboxNode
  | Dropdown4uRadioGroupNode
  | Dropdown4uSeparatorNode
  | Dropdown4uSubNode

/** 分组配置：每组可包含标签、节点列表与末尾分隔线。 */
export interface Dropdown4uGroup {
  key?: string
  label?: React.ReactNode
  className?: string
  labelClassName?: string
  items: Dropdown4uNode[]
  separator?: boolean
}

/** Dropdown4u 组件整体参数。 */
export interface Dropdown4uProps {
  variant?: React.ComponentProps<typeof Button>["variant"] // "outline" | "default" | "destructive" | "ghost" | "link" | "secondary"
  triggerText?: React.ReactNode
  trigger?: React.ReactNode
  triggerAsChild?: boolean
  contentProps?: Omit<React.ComponentProps<typeof DropdownMenuContent>, "children" | "className">
  contentClassName?: string
  groupClassName?: string
  labelClassName?: string
  itemClassName?: string
  checkboxItemClassName?: string
  radioGroupClassName?: string
  radioItemClassName?: string
  separatorClassName?: string
  subTriggerClassName?: string
  subContentClassName?: string
  groups: Dropdown4uGroup[]
}

export function Dropdown4u(props: Dropdown4uProps) {
  const defaultTrigger = (
    <Button variant={props.variant ?? "outline"}>{props.triggerText ?? "Open"}</Button>
  )

  const triggerNode = props.trigger ?? defaultTrigger

  const renderNodes = (nodes: Dropdown4uNode[], keyPrefix: string) => {
    return nodes.map((node, index) => {
      const nodeKey = node.key ?? `${keyPrefix}-${index}`

      if (node.type === "separator") {
        return <DropdownMenuSeparator key={nodeKey} className={cn(props.separatorClassName, node.className)} />
      }

      if (node.type === "sub") {
        return (
          <DropdownMenuSub key={nodeKey}>
            <DropdownMenuSubTrigger
              disabled={node.disabled ?? false}
              className={cn(props.subTriggerClassName, node.triggerClassName)}
            >
              {node.trigger}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className={cn(props.subContentClassName, node.contentClassName)}>
                {renderNodes(node.items, `${nodeKey}-sub`)}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )
      }

      if (node.type === "checkbox") {
        return (
          <DropdownMenuCheckboxItem
            key={nodeKey}
            checked={node.checked}
            onCheckedChange={node.onCheckedChange}
            disabled={node.disabled ?? false}
            className={cn(props.checkboxItemClassName, node.className)}
          >
            {node.icon}
            {node.label}
            {node.shortcut && <DropdownMenuShortcut>{node.shortcut}</DropdownMenuShortcut>}
          </DropdownMenuCheckboxItem>
        )
      }

      if (node.type === "radio-group") {
        return (
          <DropdownMenuRadioGroup
            key={nodeKey}
            value={node.value}
            onValueChange={node.onValueChange}
            className={cn(props.radioGroupClassName, node.className)}
          >
            {node.items.map((radioItem, radioIndex) => {
              const radioKey = radioItem.key ?? `${nodeKey}-radio-${radioIndex}`
              return (
                <DropdownMenuRadioItem
                  key={radioKey}
                  value={radioItem.value}
                  disabled={radioItem.disabled ?? false}
                  className={cn(props.radioItemClassName, radioItem.className)}
                >
                  {radioItem.icon}
                  {radioItem.label}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        )
      }

      return (
        <DropdownMenuItem
          key={nodeKey}
          disabled={node.disabled ?? false}
          variant={node.variant ?? "default"}
          onSelect={node.onSelect}
          className={cn(props.itemClassName, node.className)}
        >
          {node.icon}
          {node.label}
          {node.shortcut && <DropdownMenuShortcut>{node.shortcut}</DropdownMenuShortcut>}
        </DropdownMenuItem>
      )
    })
  }

  const renderGroups = (groups: Dropdown4uGroup[]) => {
    return groups.map((group, index) => {
      const groupKey = group.key ?? `group-${index}`

      return (
        <React.Fragment key={groupKey}>
          <DropdownMenuGroup className={cn(props.groupClassName, group.className)}>
            {group.label && <DropdownMenuLabel className={cn(props.labelClassName, group.labelClassName)}>{group.label}</DropdownMenuLabel>}
            {renderNodes(group.items, groupKey)}
          </DropdownMenuGroup>
          {group.separator && <DropdownMenuSeparator className={props.separatorClassName} />}
        </React.Fragment>
      )
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={props.triggerAsChild ?? false}>
        {triggerNode}
      </DropdownMenuTrigger>
      <DropdownMenuContent className={props.contentClassName} {...props.contentProps}>
        {renderGroups(props.groups)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}