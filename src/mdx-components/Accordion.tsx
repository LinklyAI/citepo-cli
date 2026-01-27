import type { ReactNode } from 'react'

interface AccordionProps {
  title: string
  children: ReactNode
}

/** Collapsible section using native details/summary — no JS needed */
export function Accordion({ title, children }: AccordionProps) {
  return (
    <details className="not-prose group my-3 rounded-lg border border-border">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors list-none flex items-center justify-between">
        {title}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="px-4 pb-4 text-sm text-foreground/80 [&>p]:mb-2 [&>p:last-child]:mb-0">
        {children}
      </div>
    </details>
  )
}
