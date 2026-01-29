interface HeroBannerProps {
  image?: string
  alt?: string
}

/** Wabi HeroBanner — renders hero image with warm overlay if configured */
export default function HeroBanner({ image, alt = 'Hero banner' }: HeroBannerProps) {
  if (!image) return null

  return (
    <div className="relative mb-8 overflow-hidden rounded-lg">
      <img
        src={image}
        alt={alt}
        className="w-full aspect-video object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-t from-background/20 to-transparent" />
    </div>
  )
}
