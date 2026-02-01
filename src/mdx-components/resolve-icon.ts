import { icons, type LucideIcon } from 'lucide-react'

type LucideIconName = keyof typeof icons

const FALLBACK_ICON = icons.Info

/**
 * Normalize an icon name string to PascalCase LucideIconName.
 * Handles kebab-case, snake_case, spaces, and PascalCase inputs.
 */
export const toLucideIconName = (name: string): LucideIconName | null => {
  const trimmed = name.trim()
  if (!trimmed) return null
  if (trimmed in icons) return trimmed as LucideIconName

  const normalized = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .toLowerCase()
    .trim()

  if (!normalized) return null

  const pascal = normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  return pascal && pascal in icons ? (pascal as LucideIconName) : null
}

/**
 * Resolve an icon name to a Lucide icon component.
 * Returns null if no name given, falls back to Info icon if name is unrecognized.
 */
export const resolveIcon = (name?: string): LucideIcon | null => {
  if (!name) return null
  const iconName = toLucideIconName(name)
  return iconName ? icons[iconName] : FALLBACK_ICON
}

export type { LucideIconName }
