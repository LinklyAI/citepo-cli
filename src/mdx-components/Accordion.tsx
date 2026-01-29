import type { ReactNode } from 'react'
import {
  Accordion as AccordionRoot,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@ui/accordion'

interface AccordionProps {
  title: string
  children: ReactNode
}

/**
 * Collapsible section using Radix Accordion — requires client:load.
 * Single-item accordion with collapsible behavior.
 */
export function Accordion({ title, children }: AccordionProps) {
  return (
    <AccordionRoot type="single" collapsible className="not-prose my-3">
      <AccordionItem value="item-1" className="rounded-lg border border-border">
        <AccordionTrigger className="px-4 hover:no-underline">{title}</AccordionTrigger>
        <AccordionContent className="px-4 text-foreground/80">{children}</AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  )
}
