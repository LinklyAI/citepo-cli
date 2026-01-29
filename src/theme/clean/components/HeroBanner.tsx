interface HeroBannerProps {
  image?: string
  alt?: string
}

/** Clean HeroBanner — renders hero image if configured, otherwise null */
export default function HeroBanner({ image, alt = 'Hero banner' }: HeroBannerProps) {
  if (!image) return null

  return (
    <div className="mb-8">
      <img
        src={image}
        alt={alt}
        className="w-full aspect-[16/9] object-cover rounded-lg"
      />
    </div>
  )
}
