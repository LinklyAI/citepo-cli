interface TagCloudProps {
  tags: { name: string; count: number }[]
  basePath: string
}

/** Tag cloud — inline pill list linking to tag pages */
export default function TagCloud({ tags, basePath }: TagCloudProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <a
          key={tag.name}
          href={`${basePath}/${tag.name}`}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          {tag.name}
          <span className="text-muted-foreground/60">({tag.count})</span>
        </a>
      ))}
    </div>
  )
}
