import type { ReactNode } from 'react'
import { Card as CardUI, CardHeader, CardTitle, CardDescription } from '@ui/card'
import { icons, type LucideIcon } from 'lucide-react'

type LucideIconName = keyof typeof icons

const FALLBACK_ICON = icons.Info

const toLucideIconName = (name: string): LucideIconName | null => {
  const trimmed = name.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed in icons) {
    return trimmed as LucideIconName
  }

  const normalized = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .toLowerCase()
    .trim()

  if (!normalized) {
    return null
  }

  const pascal = normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  return pascal && pascal in icons ? (pascal as LucideIconName) : null
}

const resolveIcon = (name?: string): LucideIcon | null => {
  if (!name) {
    return null
  }

  const iconName = toLucideIconName(name)
  return iconName ? icons[iconName] : FALLBACK_ICON
}

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
    <CardUI className="not-prose group h-full py-4 hover:border-primary/30 hover:bg-muted/30 transition-colors">
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
