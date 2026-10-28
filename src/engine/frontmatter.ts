import { z as zod } from 'zod'

type Zod = typeof zod

/**
 * Frontmatter schema of a post. It takes the zod namespace as an argument so the
 * content collection (src/astro-project/src/content.config.ts) builds it with Astro's
 * own zod, while `citepo check` builds the same schema with the CLI's zod.
 */
export function createPostFrontmatterSchema(z: Zod) {
  return z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).optional().default([]),
    authors: z.array(z.string()).optional().default([]),
    coverImage: z.string().optional().default(''),
    draft: z.boolean().optional().default(false),
    /** Last significant update; shown to search engines as dateModified and sitemap lastmod. */
    updated: z.coerce.date().optional(),
    /** Keep this post out of search results and the sitemap. */
    noindex: z.boolean().optional().default(false),
    /** Absolute URL of the original when the post is republished from elsewhere. */
    canonical: z
      .string()
      .url()
      .refine((value) => /^https?:\/\//i.test(value), 'canonical must be an http(s) URL')
      .optional(),
    /** Share image for this post; defaults to coverImage, then a generated card. */
    ogImage: z.string().optional(),
    /** Custom URL slug; defaults to the file path. */
    slug: z.string().optional(),
  })
}

export const PostFrontmatterSchema = createPostFrontmatterSchema(zod)
export type PostFrontmatter = zod.infer<typeof PostFrontmatterSchema>
