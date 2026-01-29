import type { ReactNode } from 'react'
import { Badge as BadgeUI } from '@ui/badge'

interface BadgeProps {
  children: ReactNode
}

/** Inline badge label */
export function Badge({ children }: BadgeProps) {
  return (
    <BadgeUI variant="outline" className="not-prose">
      {children}
    </BadgeUI>
  )
}
