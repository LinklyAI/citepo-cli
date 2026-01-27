import type { ReactNode } from 'react'

interface StepsProps {
  children: ReactNode
}

/** Numbered step list with connecting vertical line */
export function Steps({ children }: StepsProps) {
  return (
    <div className="not-prose my-6 ml-4 border-l-2 border-border pl-6 [counter-reset:step]">
      {children}
    </div>
  )
}

interface StepProps {
  title: string
  children?: ReactNode
}

/** Individual step within a Steps container */
export function Step({ title, children }: StepProps) {
  return (
    <div className="relative pb-6 last:pb-0 [counter-increment:step]">
      {/* Step number circle */}
      <div className="absolute -left-[calc(0.75rem+1.5rem+1px)] top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold before:content-[counter(step)]" />
      <h4 className="font-semibold text-foreground text-sm mb-1">{title}</h4>
      {children && (
        <div className="text-sm text-muted-foreground [&>p]:mb-2 [&>p:last-child]:mb-0">
          {children}
        </div>
      )}
    </div>
  )
}
