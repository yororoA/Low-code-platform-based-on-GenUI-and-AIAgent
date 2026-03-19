import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"
import React from "react"

type CheckedState = boolean | "indeterminate"

/** 单个复选项参数。 */
interface Checkbox4uItem {
  id?: string
  orientation?: "horizontal" | "vertical"
  content: React.ReactNode
  description?: React.ReactNode
  className?: string
  contentClassName?: string
  labelClassName?: string
  descriptionClassName?: string
  checked?: CheckedState
  defaultChecked?: boolean
  onCheckedChange?: (checked: CheckedState) => void
  disabled?: boolean
  fieldProps?: React.ComponentProps<typeof Field>
  contentProps?: React.ComponentProps<typeof FieldContent>
  labelProps?: React.ComponentProps<typeof FieldLabel>
  descriptionProps?: React.ComponentProps<typeof FieldDescription>
  checkboxProps?: Omit<React.ComponentProps<typeof Checkbox>, "id" | "name" | "checked" | "defaultChecked" | "onCheckedChange" | "disabled">
}

/** Checkbox4u 组件参数。 */
interface Checkbox4uProps {
  legend?: {
    content: React.ReactNode
    description?: React.ReactNode
  }
  className?: string
  groupClassName?: string
  setProps?: React.ComponentProps<typeof FieldSet>
  groupProps?: React.ComponentProps<typeof FieldGroup>
  legendProps?: React.ComponentProps<typeof FieldLegend>
  legendDescriptionProps?: React.ComponentProps<typeof FieldDescription>
  items: Checkbox4uItem[]
}

export function Checkbox4u(props: Checkbox4uProps) {
  return (
    <FieldSet {...props.setProps} className={cn(props.className, props.setProps?.className)}>
      {props.legend && (
        <>
          <FieldLegend {...props.legendProps}>{props.legend.content}</FieldLegend>
          {props.legend.description && (
            <FieldDescription {...props.legendDescriptionProps}>
              {props.legend.description}
            </FieldDescription>
          )}
        </>
      )}
      <FieldGroup {...props.groupProps} className={cn(props.groupClassName ?? "mx-auto w-72", props.groupProps?.className)}>
        {props.items.map((item, index) => {
          const itemId = item.id ?? `checkbox-${index}`

          return (
            <Field
              key={itemId}
              {...item.fieldProps}
              orientation={item.fieldProps?.orientation ?? item.orientation ?? "horizontal"}
              className={cn(item.className, item.fieldProps?.className)}
            >
              <Checkbox
                {...item.checkboxProps}
                id={itemId}
                name={itemId}
                checked={item.checked}
                defaultChecked={item.defaultChecked}
                onCheckedChange={item.onCheckedChange}
                disabled={item.disabled}
              />
              <FieldContent
                {...item.contentProps}
                className={cn(item.contentClassName, item.contentProps?.className)}
              >
                <FieldLabel
                  htmlFor={itemId}
                  {...item.labelProps}
                  className={cn(item.labelClassName, item.labelProps?.className)}
                >
                  {item.content}
                </FieldLabel>
                {item.description && (
                  <FieldDescription
                    {...item.descriptionProps}
                    className={cn(item.descriptionClassName, item.descriptionProps?.className)}
                  >
                    {item.description}
                  </FieldDescription>
                )}
              </FieldContent>
            </Field>
          ) as React.ReactNode
        })}
      </FieldGroup>
    </FieldSet>
  )
}

