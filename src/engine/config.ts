import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Supported language codes */
const LanguageCode = z.enum(['en', 'zh', 'ja'])

/** Color configuration — allows user to override theme defaults */
const ColorsSchema = z
  .object({
    primary: z.string().optional(),
    background: z.string().optional(),
    foreground: z.string().optional(),
    muted: z.string().optional(),
    accent: z.string().optional(),
  })
  .optional()

/** Font configuration */
const FontSchema = z
  .object({
    sans: z.string().optional(),
    serif: z.string().optional(),
    mono: z.string().optional(),
  })
  .optional()

/** SEO configuration */
const SeoSchema = z
  .object({
    title: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().optional(),
  })
  .optional()

/** Navigation link */
const NavLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
})

/** Social links */
const SocialSchema = z
  .object({
    twitter: z.string().optional(),
    github: z.string().optional(),
    linkedin: z.string().optional(),
    email: z.string().optional(),
  })
  .optional()

/** Full blog.json schema */
export const BlogConfigSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1, 'name is required'),
  description: z.string().default(''),
  theme: z.string().default('clean'),
  defaultLanguage: LanguageCode.default('en'),
  languages: z.array(LanguageCode).optional(),
  colors: ColorsSchema,
  font: FontSchema,
  seo: SeoSchema,
  navigation: z.array(NavLinkSchema).optional(),
  social: SocialSchema,
  basePath: z.string().default('/'),
  siteUrl: z.string().url().optional(),
  rss: z.boolean().default(true),
  sitemap: z.boolean().default(true),
  llmsText: z.boolean().default(true),
  skillMd: z.boolean().default(true),
  postsPerPage: z.number().int().positive().default(10),
})

export type BlogConfig = z.infer<typeof BlogConfigSchema>
export type LanguageCodeType = z.infer<typeof LanguageCode>

/** Validate blog.json config, returns parsed data or throws on error */
export function validateBlogConfig(raw: unknown): BlogConfig {
  return BlogConfigSchema.parse(raw)
}

/** Load and validate blog.json from the given directory */
export async function loadBlogConfig(dir: string): Promise<BlogConfig> {
  const filePath = join(dir, 'blog.json')
  const content = await readFile(filePath, 'utf-8')
  const json: unknown = JSON.parse(content)
  return validateBlogConfig(json)
}
