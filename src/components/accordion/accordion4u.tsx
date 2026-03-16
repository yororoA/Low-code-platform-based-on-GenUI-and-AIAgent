import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

type Accordion4uItem = {
  value: string
  trigger: string
  content: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
}

/** 手风琴组件的通用基础参数。 */
interface Accordion4uBaseProps {
  items: Accordion4uItem[]
  className?: string
  itemClassName?: string
  triggerClassName?: string
  contentClassName?: string
}

/** 单开模式参数。 */
interface Accordion4uSingleProps extends Accordion4uBaseProps {
  type: "single"
  collapsible?: boolean
  defaultValue?: string
}

/** 多开模式参数。 */
interface Accordion4uMultipleProps extends Accordion4uBaseProps {
  type: "multiple"
  defaultValue?: string[]
}

type Accordion4uProps = Accordion4uSingleProps | Accordion4uMultipleProps

export default function Accordion4u(props: Accordion4uProps) {
  const className = props.className ?? "max-w-lg"

  const items = props.items.map((item) => (
    <AccordionItem
      key={item.value}
      value={item.value}
      className={cn(props.itemClassName, item.className)}
    >
      <AccordionTrigger className={cn(props.triggerClassName, item.triggerClassName)}>
        {item.trigger}
      </AccordionTrigger>
      <AccordionContent className={cn(props.contentClassName, item.contentClassName)}>
        {item.content}
      </AccordionContent>
    </AccordionItem>
  ))

  if (props.type === "single") {
    return (
      <Accordion
        type="single"
        collapsible={props.collapsible ?? false}
        defaultValue={props.defaultValue}
        className={className}
      >
        {items}
      </Accordion>
    )
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={props.defaultValue}
      className={className}
    >
      {items}
    </Accordion>
  )
}