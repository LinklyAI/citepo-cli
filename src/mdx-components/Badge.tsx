import type { ReactNode } from 'react'
import { Badge as BadgeUI } from '@ui/badge'

interface BadgeProps {
  variant?: 'solid' | 'outline'
  color?: "gray" | "red"
  children: ReactNode
}

/** Inline badge label */
export function Badge({ variant = 'outline', color = 'gray', children }: BadgeProps) {
  return (
    <BadgeUI variant={variant == "solid" ? 'secondary' : 'outline'} className="not-prose">
      {children}
    </BadgeUI>
  )
}
