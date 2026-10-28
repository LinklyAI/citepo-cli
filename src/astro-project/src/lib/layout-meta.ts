import type { BlogConfig } from '../../../engine/config.js'
import {
  buildAlternateLanguagesForPath,
  getLangHomeUrl,
  getRssUrl,
  isMultiLang,
} from './i18n.ts'

/** Slug of the site-level share image: {basePath}/og/index.png */
export const OG_INDEX_SLUG = 'index'

/** OpenGraph locales (language_TERRITORY) for the supported language codes. */
const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
  ja: 'ja_JP',
  ko: 'ko_KR',
  ru: 'ru_RU',
  ar: 'ar_AR',
}

export function toOgLocale(lang: string): string {
  return OG_LOCALES[lang] ?? lang
}

/** "/blog" + "/blog/zh/hello" → "/zh/hello" */
export function stripBasePath(pathname: string, basePath: string): string {
  const base = basePath === '/' ? '' : basePath.replace(/\/+$/, '')
  if (!base || (pathname !== base && !pathname.startsWith(`${base}/`))) return pathname
  return pathname.slice(base.length) || '/'
}

/** Percent-encode a path the same way the browser does, without double-encoding. */
function encodePath(pathname: string): string {
  try {
    return encodeURI(decodeURI(pathname))
  } catch {
    return pathname
  }
}

/** No trailing slash except for the root, matching Astro's trailingSlash: 'never'. */
function withoutTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname
}

/**
 * Generated share image for a page: posts get their own card, every other page uses
 * the site card. See pages/og/[...slug].png.ts.
 */
export function generatedOgImagePath(pathname: string, basePath: string, type: 'website' | 'article'): string {
  const base = basePath === '/' ? '' : basePath.replace(/\/+$/, '')
  const relative = withoutTrailingSlash(stripBasePath(pathname, basePath))
  const slug = type === 'article' && relative !== '/' ? relative.replace(/^\//, '') : OG_INDEX_SLUG
  return `${base}/og/${slug}.png`
}

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
  /** Pages kept out of search results get no canonical or hreflang links. */
  noindex?: boolean
}

export type LayoutMetaResult = {
  /** hreflang links (absolute when siteUrl is set), including x-default. */
  alternateLinks: { hreflang: string; href: string }[]
  ogLocale: string
  ogLocaleAlternates: string[]
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
  noindex = false,
}: LayoutMetaInput): LayoutMetaResult {
  const resolvedTitle = title ?? config.name
  const pageTitle =
    resolvedTitle === config.name ? resolvedTitle : `${resolvedTitle} - ${config.name}`
  const normalizedSiteUrl = siteUrl ? siteUrl.replace(/\/+$/, '') : undefined
  const canonicalUrl = normalizedSiteUrl && !noindex
    ? `${normalizedSiteUrl}${encodePath(withoutTrailingSlash(pathname))}`
    : undefined
  const rssUrl = config.rss ? getRssUrl(lang, config) : undefined
  const multiLang = isMultiLang(config)

  const resolvedAlternateLanguages =
    multiLang && type === 'website' && Object.keys(alternateLanguages).length === 0
      ? buildAlternateLanguagesForPath(pathname, config)
      : alternateLanguages

  const normalizedBasePath = config.basePath === '/'
    ? ''
    : config.basePath.replace(/\/+$/, '')

  const imagePath = ogImage ?? generatedOgImagePath(pathname, config.basePath, type)
  const resolvedOgImage = normalizedSiteUrl && !/^https?:\/\//.test(imagePath)
    ? `${normalizedSiteUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
    : imagePath

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
    lang,
    logo: config.logo,
  })

  const languages = multiLang ? (config.languages ?? []) : []
  const absolute = (path: string) => `${normalizedSiteUrl ?? ''}${encodePath(path)}`
  const alternateLinks = multiLang && !noindex && Object.keys(resolvedAlternateLanguages).length > 0
    ? [
        ...Object.entries(resolvedAlternateLanguages).map(([hreflang, path]) => ({ hreflang, href: absolute(path) })),
        {
          hreflang: 'x-default',
          href: absolute(resolvedAlternateLanguages[config.defaultLanguage] ?? getLangHomeUrl(config.defaultLanguage, config)),
        },
      ]
    : []

  return {
    alternateLinks,
    ogLocale: toOgLocale(lang),
    ogLocaleAlternates: languages.filter((l) => l !== lang).map(toOgLocale),
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
  lang: string
  logo?: string
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
  lang,
  logo,
}: JsonLdInput): Record<string, unknown> {
  if (type === 'article') {
    const data: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      inLanguage: lang,
    }
    if (canonicalUrl) {
      data.url = canonicalUrl
      data.mainEntityOfPage = { '@type': 'WebPage', '@id': canonicalUrl }
    }
    if (publishedTime) data.datePublished = publishedTime
    if (authors.length > 0) {
      data.author = authors.map((name) => ({ '@type': 'Person', name }))
    }
    if (tags.length > 0) data.keywords = tags.join(', ')
    if (resolvedOgImage) data.image = resolvedOgImage
    data.publisher = buildPublisher(siteName, logo, normalizedSiteUrl, normalizedBasePath)
    return data
  }

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: siteName,
    description,
    inLanguage: lang,
  }
  if (normalizedSiteUrl) data.url = `${normalizedSiteUrl}${normalizedBasePath}`
  return data
}

function buildPublisher(
  siteName: string,
  logo: string | undefined,
  normalizedSiteUrl: string | undefined,
  normalizedBasePath: string,
): Record<string, unknown> {
  const publisher: Record<string, unknown> = { '@type': 'Organization', name: siteName }
  if (logo) {
    const logoUrl = /^https?:\/\//.test(logo) || !normalizedSiteUrl
      ? logo
      : `${normalizedSiteUrl}${normalizedBasePath}${logo.startsWith('/') ? '' : '/'}${logo}`
    publisher.logo = { '@type': 'ImageObject', url: logoUrl }
  }
  return publisher
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
