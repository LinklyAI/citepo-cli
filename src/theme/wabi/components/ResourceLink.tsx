import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Button } from '@ui/button'
import { ChevronDown, FileText } from 'lucide-react'

interface ResourceLinkProps {
  links?: {
    llms?: string
    llmsFull?: string
    skill?: string
  }
}

const ITEMS = [
  { key: 'llms', label: 'llms.txt' },
  { key: 'llmsFull', label: 'llms-full.txt' },
  { key: 'skill', label: 'skill.md' },
] as const

export default function ResourceLink({ links }: ResourceLinkProps) {
  const items = ITEMS.flatMap((item) => {
    const href = links?.[item.key]
    return href ? [{ ...item, href }] : []
  })

  if (items.length === 0) return null

  const primary = items.find((item) => item.key === 'llms') ?? items[0]
  const menuItems = items.filter((item) => item.key !== primary?.key)

  return (
    <div className="inline-flex items-center">
      <Button
        asChild
        variant="outline"
        size="sm"
        className={menuItems.length > 0 ? 'rounded-r-none border-r-0' : ''}
      >
        <a href={primary?.href}>
          <FileText />
          {primary?.label}
        </a>
      </Button>

      {menuItems.length > 0 && (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" className="rounded-l-none">
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menuItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <a href={item.href} className="flex items-center gap-2">
                  <FileText className="size-4" />
                  {item.label}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
