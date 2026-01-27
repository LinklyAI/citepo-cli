import { useState, useEffect, useRef } from 'react'

interface Heading {
  depth: number
  slug: string
  text: string
}

interface TableOfContentsProps {
  headings: Heading[]
}

/** TOC sidebar — sticky on desktop, hidden on mobile. Active heading via IntersectionObserver. */
export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Only show h2 and h3 headings
  const tocHeadings = headings.filter((h) => h.depth >= 2 && h.depth <= 3)

  useEffect(() => {
    if (tocHeadings.length === 0) return

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      // Find the first visible heading
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id)
          break
        }
      }
    }

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0,
    })

    for (const heading of tocHeadings) {
      const el = document.getElementById(heading.slug)
      if (el) observerRef.current.observe(el)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [tocHeadings])

  if (tocHeadings.length === 0) return null

  return (
    <nav className="hidden xl:block" aria-label="Table of contents">
      <div className="sticky top-20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          On this page
        </p>
        <ul className="space-y-1.5 text-sm">
          {tocHeadings.map((heading) => {
            const isActive = activeId === heading.slug
            const indent = heading.depth === 3 ? 'pl-3' : ''

            return (
              <li key={heading.slug}>
                <a
                  href={`#${heading.slug}`}
                  className={`block py-0.5 transition-colors ${indent} ${
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {heading.text}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
