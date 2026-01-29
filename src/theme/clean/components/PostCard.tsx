interface PostCardProps {
  title: string
  description: string
  date: string
  tags: string[]
  slug: string
  coverImage?: string
  basePath?: string
  /** Pre-computed URL — if provided, overrides slug-based href */
  url?: string
}

/** Clean PostCard — minimal text line with dotted separator (next-blog style) */
export default function PostCard({
  title,
  date,
  slug,
  basePath = '/',
  url,
}: PostCardProps) {
  const href = url ?? `${basePath === '/' ? '' : basePath}/${slug}`
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <a href={href} className="group flex items-baseline no-underline -mx-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors">
      <span className="text-foreground group-hover:text-foreground/80 transition-colors">
        {title}
      </span>
      <span className="flex-1 mx-3 border-b border-dotted border-border" />
      <time
        dateTime={date}
        className="text-sm text-muted-foreground whitespace-nowrap tabular-nums"
      >
        {formattedDate}
      </time>
    </a>
  )
}
