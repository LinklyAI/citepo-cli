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
    <a
      href={href}
      className="group flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 no-underline -mx-3 p-3 rounded-md hover:bg-muted transition-colors duration-100"
    >
      <span className="text-neutral-900 dark:text-neutral-100 tracking-tight">
        {title}
      </span>
      <span className="h-0 border-b border-dashed border-border hidden md:inline-block flex-1" />
      <time
        dateTime={date}
        className="text-sm text-muted-foreground whitespace-nowrap tabular-nums font-extralight"
      >
        {formattedDate}
      </time>
    </a>
  )
}
