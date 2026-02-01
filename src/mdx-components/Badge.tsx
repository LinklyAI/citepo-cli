import type { ReactNode } from 'react'
import { cn } from '@ui/lib/utils'
import { resolveIcon, type LucideIconName } from './resolve-icon.js'

interface BadgeProps {
  /** Badge color */
  color?: 'gray' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple'
  /** Badge size */
  size?: 'sm' | 'md' | 'lg'
  /** Badge shape */
  shape?: 'rounded' | 'pill'
  /** Lucide icon name */
  icon?: LucideIconName | string
  /** Outline style instead of filled */
  stroke?: boolean
  children: ReactNode
}

const COLOR_CLASSES: Record<
  NonNullable<BadgeProps['color']>,
  { filled: string; stroke: string }
> = {
  gray: {
    filled: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    stroke: 'text-zinc-700 border-zinc-300 dark:text-zinc-300 dark:border-zinc-600',
  },
  blue: {
    filled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    stroke: 'text-blue-700 border-blue-300 dark:text-blue-300 dark:border-blue-700',
  },
  green: {
    filled: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    stroke: 'text-green-700 border-green-300 dark:text-green-300 dark:border-green-700',
  },
  yellow: {
    filled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    stroke: 'text-yellow-700 border-yellow-300 dark:text-yellow-300 dark:border-yellow-700',
  },
  orange: {
    filled: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    stroke: 'text-orange-700 border-orange-300 dark:text-orange-300 dark:border-orange-700',
  },
  red: {
    filled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    stroke: 'text-red-700 border-red-300 dark:text-red-300 dark:border-red-700',
  },
  purple: {
    filled: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    stroke: 'text-purple-700 border-purple-300 dark:text-purple-300 dark:border-purple-700',
  },
}

const SIZE_CLASSES: Record<NonNullable<BadgeProps['size']>, { badge: string; icon: string }> = {
  sm: { badge: 'px-1.5 py-0 text-[11px]', icon: 'size-3' },
  md: { badge: 'px-2 py-0.5 text-xs', icon: 'size-3.5' },
  lg: { badge: 'px-2.5 py-1 text-sm', icon: 'size-4' },
}

const SHAPE_CLASSES: Record<NonNullable<BadgeProps['shape']>, string> = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
}

/** Inline badge with color, size, shape, and icon support */
export function Badge({
  color = 'gray',
  size = 'md',
  shape = 'pill',
  icon,
  stroke = false,
  children,
}: BadgeProps) {
  const Icon = resolveIcon(icon)
  const colorStyle = COLOR_CLASSES[color]
  const sizeStyle = SIZE_CLASSES[size]

  return (
    <span
      className={cn(
        'not-prose inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap border font-medium',
        stroke ? colorStyle.stroke : `border-transparent ${colorStyle.filled}`,
        sizeStyle.badge,
        SHAPE_CLASSES[shape],
      )}
    >
      {Icon && <Icon className={cn('shrink-0', sizeStyle.icon)} />}
      {children}
    </span>
  )
}
