import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type Accordion4uItem = {
  value: string
  trigger: string
  content: string
}

interface Accordion4uBaseProps {
  items: Accordion4uItem[]
  className?: string
}

interface Accordion4uSingleProps extends Accordion4uBaseProps {
  type: "single"
  collapsible?: boolean
  defaultValue?: string
}

interface Accordion4uMultipleProps extends Accordion4uBaseProps {
  type: "multiple"
  defaultValue?: string[]
}

type Accordion4uProps = Accordion4uSingleProps | Accordion4uMultipleProps

export default function Accordion4u(props: Accordion4uProps) {
  const className = props.className ?? "max-w-lg"

  const items = props.items.map((item) => (
    <AccordionItem key={item.value} value={item.value}>
      <AccordionTrigger>{item.trigger}</AccordionTrigger>
      <AccordionContent>{item.content}</AccordionContent>
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