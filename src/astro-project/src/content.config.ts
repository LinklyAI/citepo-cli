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
  }),
})

export const collections = { blog }
