import type { ReactNode } from 'react'

interface CalloutProps {
  type?: 'info' | 'warning' | 'error' | 'tip'
  title?: string
  children: ReactNode
}

const CALLOUT_STYLES: Record<string, { bg: string; border: string; icon: string; title: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'ℹ',
    title: 'Info',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '⚠',
    title: 'Warning',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    icon: '✕',
    title: 'Error',
  },
  tip: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: '✓',
    title: 'Tip',
  },
}

/** Styled alert box with icon — info, warning, error, or tip */
export function Callout({ type = 'info', title, children }: CalloutProps) {
  const style = CALLOUT_STYLES[type] ?? CALLOUT_STYLES.info!

  return (
    <div className={`not-prose my-6 rounded-lg border p-4 ${style.bg} ${style.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5" aria-hidden="true">
          {style.icon}
        </span>
        <div className="flex-1 min-w-0">
          {(title || style.title) && (
            <p className="font-semibold text-foreground text-sm mb-1">{title ?? style.title}</p>
          )}
          <div className="text-sm text-foreground/80 [&>p]:mb-2 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
