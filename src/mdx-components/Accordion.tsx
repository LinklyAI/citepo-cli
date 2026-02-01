import type { ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'

interface AccordionProps {
  title: string
  children: ReactNode
}

/**
 * Static accordion item for MDX content.
 * Enhanced to interactive UI by AccordionGroup on the client.
 */
export function Accordion({ title, children }: AccordionProps) {
  return (
    <details
      data-accordion-item
      data-accordion-title={title}
      className="group my-3 rounded-xl border border-border shadow-sm"
    >
      <summary className="not-prose flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 text-left text-sm font-medium">
        <span>{title}</span>
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div data-accordion-content className="px-4 pb-4 text-sm">
        {children}
      </div>
    </details>
  )
}
