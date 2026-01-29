interface PaginationProps {
  currentPage: number
  totalPages: number
  /** URL for page 1 (e.g., "/" or "/en/") */
  homeUrl: string
  /** URL prefix for pages 2+ (e.g., "/page" or "/en/page") */
  paginationBase: string
}

/** Pagination — "Newer" / "Older" navigation with page indicator */
export default function Pagination({ currentPage, totalPages, homeUrl, paginationBase }: PaginationProps) {
  if (totalPages <= 1) return null

  const newerUrl = currentPage === 2 ? homeUrl : `${paginationBase}/${currentPage - 1}`
  const olderUrl = `${paginationBase}/${currentPage + 1}`
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <nav className="flex items-center justify-between pt-8 mt-8 border-t border-border" aria-label="Pagination">
      {hasPrev ? (
        <a
          href={newerUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          Newer
        </a>
      ) : (
        <span />
      )}

      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>

      {hasNext ? (
        <a
          href={olderUrl}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Older
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
          </svg>
        </a>
      ) : (
        <span />
      )}
    </nav>
  )
}
