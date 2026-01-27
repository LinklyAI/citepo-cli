import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
}

/** Inline badge label */
export function Badge({ children }: BadgeProps) {
  return (
    <span className="not-prose inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {children}
    </span>
  )
}
