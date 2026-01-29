import type { ReactNode } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@ui/alert'
import { cn } from '@ui/lib/utils'

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'tip'
  title?: string
  children: ReactNode
}

const CALLOUT_CONFIG: Record<
  string,
  { icon: string; title: string; className: string }
> = {
  info: {
    icon: 'ℹ',
    title: 'Info',
    className: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  },
  warning: {
    icon: '⚠',
    title: 'Warning',
    className: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  },
  error: {
    icon: '✕',
    title: 'Error',
    className: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
  },
  tip: {
    icon: '✓',
    title: 'Tip',
    className: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  },
}

/** Styled alert box with icon — info, warning, error, or tip */
export function Callout({ type = 'info', title, children }: CalloutProps) {
  const config = CALLOUT_CONFIG[type] ?? CALLOUT_CONFIG.info!

  return (
    <Alert className={cn('not-prose my-6', config.className)}>
      <span className="text-lg leading-none" aria-hidden="true">
        {config.icon}
      </span>
      <AlertTitle>{title ?? config.title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
