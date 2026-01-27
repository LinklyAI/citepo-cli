import type { ReactNode } from 'react'

interface AccordionGroupProps {
  children: ReactNode
}

/** Wrapper for multiple Accordion components — removes gaps between items */
export function AccordionGroup({ children }: AccordionGroupProps) {
  return (
    <div className="not-prose my-6 [&>details]:my-0 [&>details]:rounded-none [&>details]:border-b-0 [&>details:first-child]:rounded-t-lg [&>details:last-child]:rounded-b-lg [&>details:last-child]:border-b">
      {children}
    </div>
  )
}
