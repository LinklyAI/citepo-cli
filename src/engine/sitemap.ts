import type { SitemapOptions } from '@astrojs/sitemap'
import type { BlogConfig } from './config.js'
import type { PostData } from './content.js'

/**
 * Tag and pagination pages are thin navigation pages: keep them reachable through
 * site links, but do not submit them to search engines.
 */
const NON_INDEXABLE_SEGMENTS = new Set(['tags', 'page'])

/** Path of a post relative to the site root, without basePath (e.g. "/zh/hello-world"). */
export function postPathWithoutBase(post: PostData, config: BlogConfig): string {
  const multiLang = (config.languages?.length ?? 0) > 1
  const langPrefix = `${post.lang}/`
  const slug = multiLang && post.slug.startsWith(langPrefix) ? post.slug.slice(langPrefix.length) : post.slug
  return multiLang && post.lang !== config.defaultLanguage ? `/${post.lang}/${slug}` : `/${slug}`
}

function stripTrailingSlash(url: string): string {
  const parsed = new URL(url)
  return parsed.pathname.length > 1 ? url.replace(/\/+$/, '') : url
}

/** Strip basePath and an optional language prefix from a URL path. */
function relativeSegments(pathname: string, config: BlogConfig): string[] {
  const base = config.basePath === '/' ? '' : config.basePath
  const relative = base && (pathname === base || pathname.startsWith(`${base}/`)) ? pathname.slice(base.length) : pathname
  const segments = relative.split('/').filter(Boolean)
  if (segments.length > 0 && config.languages?.includes(segments[0] as never)) segments.shift()
  return segments
}

/** Options for @astrojs/sitemap: skip thin and noindex pages, add lastmod for posts and hreflang alternates. */
export function buildSitemapOptions(config: BlogConfig, posts: PostData[]): NonNullable<SitemapOptions> {
  const base = config.basePath === '/' ? '' : config.basePath
  const lastmodByPath = new Map<string, Date>()
  const noindexPaths = new Set<string>()
  for (const post of posts) {
    const pathname = `${base}${postPathWithoutBase(post, config)}`
    if (post.noindex) noindexPaths.add(pathname)
    else lastmodByPath.set(pathname, post.updated ?? post.date)
  }

  const languages = config.languages ?? []
  const multiLang = languages.length > 1

  return {
    filter: (page) => {
      const pathname = decodeURI(new URL(page).pathname).replace(/\/+$/, '')
      if (noindexPaths.has(pathname)) return false
      if (lastmodByPath.has(pathname)) return true // a post, even one under a "page/" folder
      const first = relativeSegments(pathname, config)[0]
      return !(first && NON_INDEXABLE_SEGMENTS.has(first))
    },
    serialize: (item) => {
      const pathname = decodeURI(new URL(item.url).pathname).replace(/\/+$/, '')
      const date = lastmodByPath.get(pathname)
      const lastmod = date && date.getTime() > 0 ? date : undefined
      return {
        ...item,
        ...(lastmod ? { lastmod: lastmod.toISOString() } : {}),
        // The i18n option links the default-language home as ".../blog/"; keep one URL form
        ...(item.links ? { links: item.links.map((link) => ({ ...link, url: stripTrailingSlash(link.url) })) } : {}),
      }
    },
    ...(multiLang
      ? {
          i18n: {
            defaultLocale: config.defaultLanguage,
            locales: Object.fromEntries(languages.map((lang) => [lang, lang])),
          },
        }
      : {}),
  }
}
