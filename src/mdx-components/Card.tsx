import type { ReactNode } from 'react'

interface CardProps {
  title: string
  icon?: string
  href?: string
  children?: ReactNode
}

/** Linked card with optional icon */
export function Card({ title, icon, href, children }: CardProps) {
  const content = (
    <div className="not-prose group rounded-lg border border-border p-4 hover:border-primary/30 hover:bg-muted/30 transition-colors h-full">
      <div className="flex items-start gap-3">
        {icon && <span className="text-xl leading-none mt-0.5">{icon}</span>}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
            {title}
          </h3>
          {children && (
            <div className="text-sm text-muted-foreground mt-1 [&>p]:mb-0">{children}</div>
          )}
        </div>
      </div>
    </div>
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
