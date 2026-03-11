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
import React from "react"

type CheckedState = boolean | "indeterminate"

/** 单个复选项参数。 */
interface Checkbox4uItem {
  id?: string
  orientation?: "horizontal" | "vertical"
  content: React.ReactNode
  description?: React.ReactNode
  checked?: CheckedState
  defaultChecked?: boolean
  onCheckedChange?: (checked: CheckedState) => void
  disabled?: boolean
}

/** Checkbox4u 组件参数。 */
interface Checkbox4uProps {
  legend?: {
    content: React.ReactNode
    description?: React.ReactNode
  }
  className?: string
  groupClassName?: string
  items: Checkbox4uItem[]
}

export function Checkbox4u(props: Checkbox4uProps) {
  return (
    <FieldSet className={props.className}>
      {props.legend && (
        <>
          <FieldLegend>{props.legend.content}</FieldLegend>
          {props.legend.description && (
            <FieldDescription>
              {props.legend.description}
            </FieldDescription>
          )}
        </>
      )}
      <FieldGroup className={props.groupClassName ?? "mx-auto w-72"}>
        {props.items.map((item, index) => {
          const itemId = item.id ?? `checkbox-${index}`

          return (
            <Field key={itemId} orientation={item.orientation ?? "horizontal"}>
              <Checkbox
                id={itemId}
                name={itemId}
                checked={item.checked}
                defaultChecked={item.defaultChecked}
                onCheckedChange={item.onCheckedChange}
                disabled={item.disabled}
              />
              <FieldContent>
                <FieldLabel htmlFor={itemId}>
                  {item.content}
                </FieldLabel>
                {item.description && (
                  <FieldDescription>
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

