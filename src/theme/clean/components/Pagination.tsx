interface PaginationProps {
  currentPage: number
  totalPages: number
  /** URL for page 1 (e.g., "/" or "/en/") */
  homeUrl: string
  /** URL prefix for pages 2+ (e.g., "/page" or "/en/page") */
  paginationBase: string
}

/** Clean Pagination — "Newer" / "Older" text links */
export default function Pagination({ currentPage, totalPages, homeUrl, paginationBase }: PaginationProps) {
  if (totalPages <= 1) return null

  const newerUrl = currentPage === 2 ? homeUrl : `${paginationBase}/${currentPage - 1}`
  const olderUrl = `${paginationBase}/${currentPage + 1}`
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <nav className="flex items-center justify-between pt-6 mt-6" aria-label="Pagination">
      {hasPrev ? (
        <a
          href={newerUrl}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Newer
        </a>
      ) : (
        <span />
      )}

      <span className="text-sm text-muted-foreground">
        {currentPage} / {totalPages}
      </span>

      {hasNext ? (
        <a
          href={olderUrl}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Older &rarr;
        </a>
      ) : (
        <span />
      )}
    </nav>
  )
}
