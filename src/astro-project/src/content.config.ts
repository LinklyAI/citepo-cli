import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'
import { createPostFrontmatterSchema } from '../../engine/frontmatter.js'

const contentDir = process.env.CITEPO_CONTENT_DIR || './src/content'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: contentDir }),
  // Shared with `citepo check`, built with Astro's zod
  schema: createPostFrontmatterSchema(z),
})

export const collections = { blog }
