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
import {
  getLangHomeUrl,
  getPaginationBaseUrl,
  getPostSlug,
  getPostUrl,
  getRssUrl,
  getTagsBaseUrl,
  isMultiLang,
} from './i18n.ts'

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
    coverImage: entry.data.coverImage,
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
    coverImage: entry.data.coverImage,
    headings,
  }
}
