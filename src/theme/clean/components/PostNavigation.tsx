import { ArrowLeft, ArrowRight } from "lucide-react"

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
          className="group flex flex-col gap-1 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors"
        >
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowLeft className="size-3" />
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
          className="group flex flex-col gap-1 p-3 rounded-lg bg-muted/60 hover:bg-muted transition-colors text-right"
        >
          <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
            Next
            <ArrowRight className="size-3" />
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
