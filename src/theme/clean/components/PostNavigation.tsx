interface PostLink {
  title: string
  url: string
}

interface PostNavigationProps {
  prev?: PostLink
  next?: PostLink
}

/** Post navigation — prev/next article links at the bottom of a post */
export default function PostNavigation({ prev, next }: PostNavigationProps) {
  if (!prev && !next) return null

  return (
    <nav className="grid grid-cols-2 gap-4 pt-8 mt-10 border-t border-border" aria-label="Post navigation">
      {prev ? (
        <a
          href={prev.url}
          className="group flex flex-col gap-1 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors"
        >
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
            </svg>
            Previous
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {prev.title}
          </span>
        </a>
      ) : (
        <span />
      )}

      {next ? (
        <a
          href={next.url}
          className="group flex flex-col gap-1 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors text-right"
        >
          <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
            Next
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
            </svg>
          </span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {next.title}
          </span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  )
}
