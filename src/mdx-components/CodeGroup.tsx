import { useState, type ReactNode, type ReactElement, Children, isValidElement } from 'react'

interface CodeGroupProps {
  children: ReactNode
}

/**
 * Tab switcher for code blocks — requires client:load.
 * Wraps multiple code blocks (```lang) and renders them as tabs.
 * Each child should be a <pre> or a wrapper containing <pre>.
 */
export function CodeGroup({ children }: CodeGroupProps) {
  const [activeTab, setActiveTab] = useState(0)

  // Extract tab labels from children (code block language or title)
  const tabs: { label: string; element: ReactElement }[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return

    // Try to extract language from code block structure
    const label = extractLabel(child)
    tabs.push({ label, element: child })
  })

  if (tabs.length === 0) return null
  if (tabs.length === 1) return <>{tabs[0]!.element}</>

  return (
    <div className="not-prose my-6 rounded-lg border border-border overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-muted/50">
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              i === activeTab
                ? 'text-foreground border-b-2 border-primary bg-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="[&>pre]:rounded-none [&>pre]:border-0 [&>pre]:my-0">
        {tabs[activeTab]?.element}
      </div>
    </div>
  )
}

/** Extract a display label from a code block element */
function extractLabel(element: ReactElement): string {
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

  return `Tab ${extractLabel.counter = (extractLabel.counter ?? 0) + 1}`
}
// Counter for unnamed tabs
extractLabel.counter = 0
