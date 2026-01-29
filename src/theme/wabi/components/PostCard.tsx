import { Badge } from '@ui/badge'

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

/** Wabi PostCard — horizontal card layout with cover image (linkly-ai-web style) */
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
    <a href={href} className="group block no-underline">
      <article className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 rounded-lg border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors duration-200">
        {coverImage && (
          <div className="sm:w-48 sm:flex-shrink-0">
            <div className="relative aspect-video sm:aspect-[4/3] rounded-md overflow-hidden bg-muted border">
              <img
                src={coverImage}
                alt={title}
                className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-200"
              />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <time dateTime={date}>{formattedDate}</time>
            {tags.length > 0 && (
              <>
                {tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </>
            )}
          </div>
          <h2 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h2>
          {description && (
            <p className="text-foreground/80 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </article>
    </a>
  )
}
