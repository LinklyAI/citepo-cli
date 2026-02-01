import type { ReactNode } from 'react'
import { Card as CardUI, CardHeader, CardTitle, CardDescription } from '@ui/card'
import { resolveIcon, type LucideIconName } from './resolve-icon.js'

interface CardProps {
  title: string
  icon?: LucideIconName | string
  href?: string
  children?: ReactNode
}

/** Linked card with optional icon */
export function Card({ title, icon, href, children }: CardProps) {
  const Icon = resolveIcon(icon)
  const content = (
    <CardUI className="not-prose group h-full py-4 hover:border-primary/20 hover:bg-muted/30 transition-colors">
      <CardHeader className="gap-1">
        <CardTitle className="flex items-start gap-3 text-sm group-hover:text-primary transition-colors">
          {Icon && <Icon className="size-4 mt-0.5 text-muted-foreground" />}
          {title}
        </CardTitle>
        {children && <CardDescription>{children}</CardDescription>}
      </CardHeader>
    </CardUI>
  )

  if (href) {
    return (
      <a href={href} className="no-underline block">
        {content}
      </a>
    )
  }

  return content
}
