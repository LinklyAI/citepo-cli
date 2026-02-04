import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { LANGUAGE_CODES } from './languages.js'

/** Supported language codes */
const LanguageCode = z.enum(LANGUAGE_CODES)

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

/** Supported theme names */
export const SUPPORTED_THEMES = ['clean', 'wabi'] as const
const ThemeName = z.enum(SUPPORTED_THEMES)
export type ThemeNameType = z.infer<typeof ThemeName>

/** Hero banner configuration */
const HeroSchema = z
  .object({
    image: z.string().optional(),
  })
  .optional()

/** Contextual menu configuration */
const ContextualSchema = z
  .object({
    options: z.array(z.enum(['copy', 'view', 'chatgpt', 'claude'])).optional(),
  })
  .optional()

/** Full blog.json schema */
export const BlogConfigSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().min(1, 'name is required'),
  description: z.string().default(''),
  theme: ThemeName.default('clean'),
  logo: z.string().optional(),
  defaultLanguage: LanguageCode.default('en'),
  languages: z.array(LanguageCode).optional(),
  colors: ColorsSchema,
  font: FontSchema,
  seo: SeoSchema,
  hero: HeroSchema,
  contextual: ContextualSchema,
  navigation: z.array(NavLinkSchema).optional(),
  social: SocialSchema,
  basePath: z.string().default('/'),
  rss: z.boolean().default(true),
  sitemap: z.boolean().default(true),
  llmsText: z.boolean().default(true),
  skillMd: z.boolean().default(true),
  postsPerPage: z.number().int().positive().default(10),
})

export type BlogConfig = z.infer<typeof BlogConfigSchema>
export type LanguageCodeType = z.infer<typeof LanguageCode>

/** Normalize basePath to a leading-slash, no-trailing-slash path. */
export function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim()
  if (!trimmed || trimmed === '/') return '/'
  if (trimmed.includes('://')) {
    throw new Error('basePath must be a path, not a full URL')
  }

  let normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  normalized = normalized.replace(/\/+$/, '')
  normalized = `/${normalized.replace(/^\/+/, '')}`
  return normalized === '/' ? '/' : normalized
}

/** Validate blog.json config, returns parsed data or throws on error */
export function validateBlogConfig(raw: unknown): BlogConfig {
  const config = BlogConfigSchema.parse(raw)
  config.basePath = normalizeBasePath(config.basePath)
  return config
}

/** Load and validate blog.json from the given directory */
export async function loadBlogConfig(dir: string): Promise<BlogConfig> {
  const filePath = join(dir, 'blog.json')
  const content = await readFile(filePath, 'utf-8')
  const json: unknown = JSON.parse(content)
  return validateBlogConfig(json)
}
