import path from 'node:path'
import type { BlogConfig } from '../../../engine/config.js'
import type {
  IndexPageProps,
  ListPageProps,
  PostPageProps,
  PostSummary,
  PaginationProps,
  SiteProps,
  PostLink,
} from '../../../theme/theme-types.js'
import { resolveImageUrl } from '../../../engine/remark-relative-images.js'
import {
  getLangHomeUrl,
  getPaginationBaseUrl,
  getPostSlug,
  getPostUrl,
  getRssUrl,
  getTagsBaseUrl,
  isMultiLang,
} from './i18n.ts'

/**
 * Resolve coverImage URL, handling relative paths like MDX content images.
 * Uses the same logic as remark-relative-images plugin.
 */
export function resolveCoverImage(coverImage: string | undefined, entryId: string): string | undefined {
  console.log(`[resolveCoverImage] CALLED with coverImage="${coverImage}", entryId="${entryId}"`)
  if (!coverImage) return undefined

  // Handle simple cases that don't need contentDir
  // External URLs - keep as-is
  if (coverImage.startsWith('http://') || coverImage.startsWith('https://') || coverImage.startsWith('//')) {
    return coverImage
  }
  // Already absolute path - keep as-is
  if (coverImage.startsWith('/')) {
    return coverImage
  }
  // images/ alias - convert to absolute path
  if (coverImage.startsWith('images/')) {
    return `/${coverImage}`
  }

  // For relative paths, we need contentDir to resolve them
  const contentDir = process.env.CITEPO_CONTENT_DIR
  if (!contentDir) {
    console.warn(`[resolveCoverImage] CITEPO_CONTENT_DIR not set, cannot resolve: ${coverImage}`)
    return coverImage
  }

  // Derive assetDir from contentDir (sibling directory)
  const userDir = path.dirname(contentDir)
  const assetDir = path.join(userDir, 'asset')

  // Get the directory containing the MDX file
  // entry.id is like "zh/hello-world" or "hello-world"
  const entryDir = path.dirname(entryId)
  const sourceDir = entryDir && entryDir !== '.' ? path.join(contentDir, entryDir) : contentDir

  console.log(`[resolveCoverImage] entryId=${entryId}, entryDir=${entryDir}, sourceDir=${sourceDir}, coverImage=${coverImage}`)

  const result = resolveImageUrl({
    imageUrl: coverImage,
    sourceDir,
    contentDir,
    assetDir,
  })

  console.log(`[resolveCoverImage] result=${result}`)
  return result
}

export type BuildSitePropsOptions = {
  config: BlogConfig
  lang: string
  translations?: Record<string, string>
}

export type BuildIndexPagePropsOptions = BuildSitePropsOptions & {
  posts: PostSummary[]
  pagination?: PaginationProps
}

export type BuildListPagePropsOptions = BuildSitePropsOptions & {
  title: string
  description?: string
  items: PostSummary[]
  pagination?: PaginationProps
  backLink?: ListPageProps['backLink']
}

export type BuildPostPagePropsOptions = BuildSitePropsOptions & {
  post: PostPageProps['post']
  navigation?: {
    prev?: PostLink
    next?: PostLink
  }
  contextualOptions?: PostPageProps['contextualOptions']
}

export type PostEntryLike = {
  id: string
  data: {
    title: string
    description?: string
    date: Date
    tags?: string[]
    authors?: string[]
    coverImage?: string
  }
}

export function buildSiteProps({
  config,
  lang,
  translations,
}: BuildSitePropsOptions): SiteProps {
  const multiLang = isMultiLang(config)
  const homeUrl = getLangHomeUrl(lang, config)
  const resourceBase = homeUrl === '/' ? '' : homeUrl.replace(/\/+$/, '')

  return {
    name: config.name,
    description: config.description || undefined,
    logo: config.logo,
    basePath: config.basePath,
    lang,
    languages: multiLang ? config.languages : undefined,
    translations: multiLang ? translations : undefined,
    navigation: config.navigation,
    social: config.social,
    resourceLinks: {
      rss: config.rss ? getRssUrl(lang, config) : undefined,
      llms: config.llmsText ? `${resourceBase}/llms.txt` : undefined,
      llmsFull: config.llmsText ? `${resourceBase}/llms-full.txt` : undefined,
      skill: config.skillMd ? `${resourceBase}/skill.md` : undefined,
    },
    urls: {
      home: homeUrl,
      tagsBase: getTagsBaseUrl(lang, config),
      paginationBase: getPaginationBaseUrl(lang, config),
    },
  }
}

export function buildIndexPageProps(options: BuildIndexPagePropsOptions): IndexPageProps {
  const { config, posts, pagination } = options

  return {
    site: buildSiteProps(options),
    hero: config.hero ? { image: config.hero.image } : undefined,
    posts,
    pagination,
  }
}

export function buildListPageProps(options: BuildListPagePropsOptions): ListPageProps {
  const { title, description, items, pagination, backLink } = options

  return {
    site: buildSiteProps(options),
    title,
    description,
    items,
    pagination,
    backLink,
  }
}

export function buildPostPageProps(options: BuildPostPagePropsOptions): PostPageProps {
  const { post, navigation, contextualOptions } = options

  return {
    site: buildSiteProps(options),
    post,
    navigation,
    contextualOptions,
  }
}

export function mapPostEntryToSummary(entry: PostEntryLike, config: BlogConfig): PostSummary {
  const dateIso = entry.data.date.toISOString()

  return {
    title: entry.data.title,
    description: entry.data.description,
    url: getPostUrl(entry.id, config),
    slug: getPostSlug(entry.id, config),
    date: dateIso,
    dateISO: dateIso,
    tags: entry.data.tags,
    authors: entry.data.authors,
    coverImage: resolveCoverImage(entry.data.coverImage, entry.id),
  }
}

export function mapPostEntryToPost(
  entry: PostEntryLike,
  headings?: PostPageProps['post']['headings'],
): PostPageProps['post'] {
  const dateIso = entry.data.date.toISOString()

  return {
    title: entry.data.title,
    description: entry.data.description,
    date: dateIso,
    dateISO: dateIso,
    tags: entry.data.tags,
    authors: entry.data.authors,
    coverImage: resolveCoverImage(entry.data.coverImage, entry.id),
    headings,
  }
}
