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
import React, { useState } from "react"
// import { z } from "zod"

interface ChartItem {
  oriantation?: "horizontal" | "vertical",
  content: string,
  description?: string,
  defaultChecked?: boolean,
  disabled?: boolean,
}

interface Chart4uProps {
  legand?: {
    content: string,
    description?: string,
    // variant
  },
  className?: string,
  items: ChartItem[]
}

export function Chart4u(props: Chart4uProps) {
  // const [checked, setChecked] = useState(false);

  return (
    <FieldSet className={props.className}>
      {props.legand && (
        <>
          <FieldLegend>{props.legand.content}</FieldLegend>
          {props.legand.description && (
            <FieldDescription>
              {props.legand.description}
            </FieldDescription>
          )}
        </>
      )}
      <FieldGroup className={props.className ?? "mx-auto w-72"}>
        {props.items.map((item, index) => {
          return (
            <Field key={index} orientation={item.oriantation ?? "horizontal"}>
              <Checkbox
                id={`checkbox-${index}-${item.content}`}
                name={`checkbox-${index}-${item.content}`}
                defaultChecked={item.defaultChecked}
                disabled={item.disabled}
              />
              <FieldContent>
                <FieldLabel htmlFor={`checkbox-${index}`}>
                  {item.content}
                </FieldLabel>
                {item.description && (
                  <FieldDescription>
                    {item.description}
                  </FieldDescription>
                )}
              </FieldContent>
            </Field>
          ) as React.ReactNode;
        })}
      </FieldGroup>
    </FieldSet>
  );
}