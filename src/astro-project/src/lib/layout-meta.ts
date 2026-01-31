import type { BlogConfig } from '../../../engine/config.js'
import {
  buildAlternateLanguagesForPath,
  getRssUrl,
  isMultiLang,
} from './i18n.ts'

export type LayoutMetaInput = {
  config: BlogConfig
  siteUrl?: string
  pathname: string
  title?: string
  description?: string
  ogImage?: string
  type?: 'website' | 'article'
  publishedTime?: string
  authors?: string[]
  tags?: string[]
  lang: string
  alternateLanguages?: Record<string, string>
}

export type LayoutMetaResult = {
  pageTitle: string
  canonicalUrl?: string
  rssUrl?: string
  resolvedOgImage?: string
  resolvedAlternateLanguages: Record<string, string>
  jsonLd: Record<string, unknown>
  colorOverrides?: string
  multiLang: boolean
}

export function buildLayoutMeta({
  config,
  siteUrl,
  pathname,
  title,
  description,
  ogImage,
  type = 'website',
  publishedTime,
  authors = [],
  tags = [],
  lang,
  alternateLanguages = {},
}: LayoutMetaInput): LayoutMetaResult {
  const resolvedTitle = title ?? config.name
  const pageTitle =
    resolvedTitle === config.name ? resolvedTitle : `${resolvedTitle} - ${config.name}`
  const canonicalUrl = siteUrl ? `${siteUrl}${pathname}` : undefined
  const rssUrl = config.rss ? getRssUrl(lang, config) : undefined
  const multiLang = isMultiLang(config)

  const resolvedAlternateLanguages =
    multiLang && type === 'website' && Object.keys(alternateLanguages).length === 0
      ? buildAlternateLanguagesForPath(pathname, config)
      : alternateLanguages

  const normalizedSiteUrl = siteUrl ? siteUrl.replace(/\/+$/, '') : undefined
  const normalizedBasePath = config.basePath === '/'
    ? ''
    : config.basePath.replace(/\/+$/, '')

  const resolvedOgImage = ogImage
    ? (siteUrl && !ogImage.startsWith('http') ? `${siteUrl}${ogImage}` : ogImage)
    : siteUrl
      ? `${siteUrl}${normalizedBasePath}/og-image.png?${new URLSearchParams({
          title: resolvedTitle,
          ...(authors.length > 0 ? { author: authors[0] } : {}),
          site: config.name,
          ...(config.theme ? { theme: config.theme } : {}),
        }).toString()}`
      : undefined

  const jsonLd = buildJsonLd({
    type,
    title: resolvedTitle,
    description,
    canonicalUrl,
    publishedTime,
    authors,
    tags,
    resolvedOgImage,
    normalizedSiteUrl,
    normalizedBasePath,
    siteName: config.name,
  })

  return {
    pageTitle,
    canonicalUrl,
    rssUrl,
    resolvedOgImage,
    resolvedAlternateLanguages,
    jsonLd,
    colorOverrides: buildColorOverrides(config),
    multiLang,
  }
}

type JsonLdInput = {
  type: 'website' | 'article'
  title: string
  description?: string
  canonicalUrl?: string
  publishedTime?: string
  authors: string[]
  tags: string[]
  resolvedOgImage?: string
  normalizedSiteUrl?: string
  normalizedBasePath: string
  siteName: string
}

function buildJsonLd({
  type,
  title,
  description,
  canonicalUrl,
  publishedTime,
  authors,
  tags,
  resolvedOgImage,
  normalizedSiteUrl,
  normalizedBasePath,
  siteName,
}: JsonLdInput): Record<string, unknown> {
  if (type === 'article') {
    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
    }
    if (canonicalUrl) data.url = canonicalUrl
    if (publishedTime) data.datePublished = publishedTime
    if (authors.length > 0) {
      data.author = authors.map((name) => ({ '@type': 'Person', name }))
    }
    if (tags.length > 0) data.keywords = tags.join(', ')
    if (resolvedOgImage) data.image = resolvedOgImage
    return data
  }

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: siteName,
    description,
  }
  if (normalizedSiteUrl) data.url = `${normalizedSiteUrl}${normalizedBasePath}`
  return data
}

function buildColorOverrides(config: BlogConfig): string | undefined {
  const colors = config.colors
  if (!colors) return undefined

  const vars: string[] = []
  if (colors.primary) vars.push(`--primary: ${colors.primary};`)
  if (colors.background) vars.push(`--background: ${colors.background};`)
  if (colors.foreground) vars.push(`--foreground: ${colors.foreground};`)
  if (colors.muted) vars.push(`--muted: ${colors.muted};`)
  if (colors.accent) vars.push(`--accent: ${colors.accent};`)

  if (vars.length === 0) return undefined
  return `:root { ${vars.join(' ')} }`
}
