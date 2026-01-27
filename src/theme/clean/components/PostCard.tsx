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

/** Post card — displays a single post summary on the blog list page */
export default function PostCard({
  title,
  description,
  date,
  tags,
  slug,
  coverImage,
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
    <a href={href} className="block no-underline">
      <article className="group flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 -mx-4 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors duration-200">
        {coverImage && (
          <div className="sm:w-48 sm:flex-shrink-0 overflow-hidden rounded-md">
            <img
              src={coverImage}
              alt={title}
              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <time dateTime={date}>{formattedDate}</time>
            {tags.length > 0 && (
              <>
                <span className="text-border">&middot;</span>
                <div className="flex gap-1.5 flex-wrap">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <h2 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors duration-200">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </article>
    </a>
  )
}
