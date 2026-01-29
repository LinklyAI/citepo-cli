import { Children, isValidElement, type ReactNode, type ReactElement } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ui/tabs'

interface CodeGroupProps {
  children: ReactNode
}

/**
 * Tab switcher for code blocks — requires client:load.
 * Wraps multiple code blocks (```lang) and renders them as tabs.
 * Each child should be a <pre> or a wrapper containing <pre>.
 */
export function CodeGroup({ children }: CodeGroupProps) {
  const tabs: { label: string; element: ReactElement }[] = []
  let counter = 0

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const label = extractLabel(child, ++counter)
    tabs.push({ label, element: child })
  })

  if (tabs.length === 0) return null
  if (tabs.length === 1) return <>{tabs[0]!.element}</>

  return (
    <Tabs defaultValue="tab-0" className="not-prose my-6 rounded-lg border border-border overflow-hidden">
      <TabsList variant="line" className="w-full justify-start rounded-none border-b border-border bg-muted/50 px-0">
        {tabs.map((tab, i) => (
          <TabsTrigger
            key={i}
            value={`tab-${i}`}
            className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab, i) => (
        <TabsContent
          key={i}
          value={`tab-${i}`}
          className="mt-0 [&>pre]:rounded-none [&>pre]:border-0 [&>pre]:my-0"
        >
          {tab.element}
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** Extract a display label from a code block element */
function extractLabel(element: ReactElement, fallbackIndex: number): string {
  const props = element.props as Record<string, unknown>

  // Check for data-language attribute (common in code highlighting)
  if (typeof props['data-language'] === 'string') return props['data-language']

  // Check className for language-xxx
  if (typeof props.className === 'string') {
    const match = props.className.match(/language-(\w+)/)
    if (match?.[1]) return match[1]
  }

  // Check children for pre > code with className
  if (isValidElement(props.children)) {
    const childProps = (props.children as ReactElement).props as Record<string, unknown>
    if (typeof childProps.className === 'string') {
      const match = childProps.className.match(/language-(\w+)/)
      if (match?.[1]) return match[1]
    }
  }

  return `Tab ${fallbackIndex}`
}
