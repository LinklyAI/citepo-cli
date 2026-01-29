import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@ui/accordion'

interface AccordionGroupProps {
  children: ReactNode
}

/**
 * Wrapper for multiple accordion items using Radix Accordion — requires client:load.
 * Accepts Accordion children and renders them as a unified group.
 */
export function AccordionGroup({ children }: AccordionGroupProps) {
  const items: { title: string; content: ReactNode }[] = []

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const props = (child as ReactElement<{ title?: string; children?: ReactNode }>).props
    if (props.title) {
      items.push({ title: props.title, content: props.children })
    }
  })

  if (items.length === 0) return null

  return (
    <Accordion type="single" collapsible className="not-prose my-6">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="px-4 hover:no-underline">{item.title}</AccordionTrigger>
          <AccordionContent className="px-4 text-foreground/80">{item.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
