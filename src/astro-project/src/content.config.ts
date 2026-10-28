import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const contentDir = process.env.CITEPO_CONTENT_DIR || './src/content'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: contentDir }),
  schema: z.object({
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
    canonical: z.string().url().optional(),
    /** Share image for this post; defaults to coverImage, then a generated card. */
    ogImage: z.string().optional(),
  }),
})

export const collections = { blog }
