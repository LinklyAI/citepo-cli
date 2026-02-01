import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@ui/accordion'
import { Skeleton } from '@ui/skeleton'

interface AccordionGroupProps {
  children: ReactNode
}

/**
 * Client-enhanced accordion group.
 * Renders static HTML on SSR, then upgrades to Radix UI on the client.
 */
export function AccordionGroup({ children }: AccordionGroupProps) {
  const fallbackRef = useRef<HTMLDivElement | null>(null)
  const [items, setItems] = useState<Array<{ title: string; html: string }> | null>(null)

  useLayoutEffect(() => {
    const root = fallbackRef.current
    if (!root) return

    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-accordion-item]'))
    const parsed = nodes
      .map((node, index) => {
        const title =
          node.dataset.accordionTitle?.trim() ||
          node.getAttribute('data-title')?.trim() ||
          node.querySelector('summary')?.textContent?.trim() ||
          `Item ${index + 1}`
        const contentEl = node.querySelector<HTMLElement>('[data-accordion-content]')
        const html = contentEl?.innerHTML?.trim() ?? ''
        return { title, html }
      })
      .filter((item) => item.title && item.html)

    if (parsed.length > 0) setItems(parsed)
  }, [])

  if (!items) {
    return (
      <div className="not-prose my-6">
        <div ref={fallbackRef} className="hidden" hidden aria-hidden="true">
          {children}
        </div>
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-3/5 rounded-md" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className=" my-6 border rounded-xl shadow-sm">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="px-4 hover:no-underline">{item.title}</AccordionTrigger>
          <AccordionContent className="px-4">
            <div dangerouslySetInnerHTML={{ __html: item.html }} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
