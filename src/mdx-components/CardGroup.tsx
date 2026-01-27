import type { ReactNode } from 'react'

interface CardGroupProps {
  cols?: 2 | 3
  children: ReactNode
}

/** Grid wrapper for Card components */
export function CardGroup({ cols = 2, children }: CardGroupProps) {
  const gridClass = cols === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'

  return <div className={`not-prose grid gap-4 my-6 ${gridClass}`}>{children}</div>
}
