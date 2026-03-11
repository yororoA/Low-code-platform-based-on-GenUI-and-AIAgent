import * as React from "react"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { cn } from "@/lib/utils"

/** 单个字段项参数。 */
export interface Field4uItem {
  id?: string
  control: React.ReactNode
  label?: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  fieldProps?: React.ComponentProps<typeof Field>
  contentProps?: React.ComponentProps<typeof FieldContent>
  labelProps?: React.ComponentProps<typeof FieldLabel>
  descriptionProps?: React.ComponentProps<typeof FieldDescription>
  errorProps?: React.ComponentProps<typeof FieldError>
}

/** Field4u 组件参数：支持图例、分组与字段项渲染。 */
export interface Field4uProps {
  legend?: React.ReactNode
  className?: string
  legendProps?: React.ComponentProps<typeof FieldLegend>
  groupProps?: React.ComponentProps<typeof FieldGroup>
  setProps?: React.ComponentProps<typeof FieldSet>
  items: Field4uItem[]
}

export function Field4u({
  legend,
  className,
  legendProps,
  groupProps,
  setProps,
  items,
}: Field4uProps) {
  return (
    <FieldSet {...setProps} className={cn(className, setProps?.className)}>
      {legend && <FieldLegend {...legendProps}>{legend}</FieldLegend>}
      <FieldGroup {...groupProps}>
        {items.map((item, index) => {
          const itemId = item.id ?? `field-${index}`

          return (
            <Field key={itemId} {...item.fieldProps}>
              {item.control}
              {(item.label || item.description || item.error) && (
                <FieldContent {...item.contentProps}>
                  {item.label && (
                    <FieldLabel htmlFor={itemId} {...item.labelProps}>
                      {item.label}
                    </FieldLabel>
                  )}
                  {item.description && (
                    <FieldDescription {...item.descriptionProps}>
                      {item.description}
                    </FieldDescription>
                  )}
                  {item.error && (
                    <FieldError {...item.errorProps}>{item.error}</FieldError>
                  )}
                </FieldContent>
              )}
            </Field>
          )
        })}
      </FieldGroup>
    </FieldSet>
  )
}
