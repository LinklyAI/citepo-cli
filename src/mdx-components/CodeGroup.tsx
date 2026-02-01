import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ui/tabs'
import { highlight } from 'sugar-high'
import { Button } from '@ui/button'
import { Skeleton } from '@ui/skeleton'
import { Check, Copy, Terminal } from 'lucide-react'

interface CodeGroupProps {
  children: ReactNode
  labels?: string
}

/**
 * Tab switcher for code blocks — requires client:load.
 * Wraps multiple code blocks (```lang) and renders them as tabs.
 * Each child should be a <pre> or a wrapper containing <pre>.
 */
export function CodeGroup({ children, labels }: CodeGroupProps) {
  const fallbackRef = useRef<HTMLDivElement | null>(null)
  const [tabs, setTabs] = useState<
    Array<{ label: string; language: string; code: string; html: string }> | null
  >(null)
  const [activeTab, setActiveTab] = useState('tab-0')
  const [copied, setCopied] = useState(false)
  const labelOverrides = useMemo(() => {
    if (!labels) return []
    return labels
      .split('|')
      .map((label) => label.trim())
      .filter(Boolean)
  }, [labels])

  useEffect(() => {
    const root = fallbackRef.current
    if (!root) return

    const preNodes = Array.from(root.querySelectorAll<HTMLPreElement>('pre'))
    if (preNodes.length <= 1) return

    const parsed = preNodes.map((pre, index) => {
      const info = extractInfoFromPre(pre, index + 1)
      const language = normalizeLanguage(info.language)
      const label = labelOverrides[index] || info.label
      const codeText = pre.textContent ?? ''
      const highlighted = highlight(codeText)
      const html = `<pre data-language="${language}"><code class="language-${language}">${highlighted}</code></pre>`
      return { label, language, code: codeText, html }
    })

    setTabs(parsed)
  }, [])

  const activeIndex = useMemo(() => {
    const index = Number(activeTab.replace('tab-', ''))
    return Number.isNaN(index) ? 0 : index
  }, [activeTab])

  const handleCopy = useCallback(async () => {
    if (!tabs?.length) return
    const code = tabs[activeIndex]?.code ?? ''
    try {
      await navigator.clipboard.writeText(code.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }, [activeIndex, tabs])

  if (!tabs) {
    return (
      <div className="not-prose my-6">
        <div ref={fallbackRef} hidden aria-hidden="true">
          {children}
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="flex items-center justify-between gap-2 px-1 py-1">
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
          <Skeleton className="mt-2 h-12 w-full rounded-md" />
        </div>
      </div>
    )
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="not-prose my-6 rounded-lg overflow-hidden gap-0 bg-muted/50 font-mono text-sm"
    >
      <div className="flex items-center justify-start gap-2 px-2 py-1">
        <Terminal className='size-4' />
        <TabsList variant="default" className="not-prose my-0.5">
          {tabs.map((tab, i) => (
            <TabsTrigger
              key={i}
              value={`tab-${i}`}
              className=''
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy code"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground ml-auto"
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      {tabs.map((tab, i) => (
        <TabsContent
          key={i}
          value={`tab-${i}`}
          className="not-prose border-t border-border/40 [&_pre]:bg-muted/50! [&_pre]:p-4! [&_pre]:overflow-x-auto"
        >
          <div dangerouslySetInnerHTML={{ __html: tab.html }} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** Extract a display label from a code block element */
function extractLabelFromPre(element: HTMLPreElement, fallbackIndex: number): string {
  const dataLanguage = element.dataset.language?.trim()
  if (dataLanguage) return dataLanguage

  if (element.className) {
    const match = element.className.match(/language-(\w+)/)
    if (match?.[1]) return match[1]
  }

  const code = element.querySelector('code')
  if (code?.className) {
    const match = code.className.match(/language-(\w+)/)
    if (match?.[1]) return match[1]
  }

  return `Tab ${fallbackIndex}`
}

function normalizeLanguage(label: string) {
  const normalized = label.toLowerCase().replace(/[^a-z0-9-]/g, '')
  return normalized || 'text'
}

function extractInfoFromPre(element: HTMLPreElement, fallbackIndex: number) {
  const code = element.querySelector('code')
  const rawLanguage =
    element.dataset.language?.trim() ||
    element.getAttribute('data-language')?.trim() ||
    element.getAttribute('data-lang')?.trim()

  const languageFromClass = extractLabelFromPre(element, fallbackIndex)
  const languageTokens = rawLanguage?.split(/\s+/).filter(Boolean) ?? []
  const language = languageTokens[0] ?? languageFromClass

  const meta =
    code?.dataset.meta ||
    code?.getAttribute('data-meta') ||
    element.dataset.meta ||
    element.getAttribute('data-meta') ||
    element.getAttribute('data-title') ||
    element.getAttribute('data-label') ||
    element.getAttribute('data-name') ||
    element.getAttribute('title')

  const metaLabel = meta?.trim().split(/\s+/)[0]
  const infoLabel = languageTokens.length > 1 ? languageTokens[1] : undefined
  const label = metaLabel || infoLabel || language || `Tab ${fallbackIndex}`

  return { language, label }
}
