/**
 * i18n utility library for multi-language blog routing.
 *
 * Multi-lang detection: `languages` array in blog.json with 2+ items.
 * Content IDs: multi-lang "zh/hello-world", single-lang "hello-world".
 *
 * URL structure:
 *   - Single-lang: no language prefix → /hello-world
 *   - Multi-lang: default language has no prefix → /hello-world
 *   - Multi-lang: other languages prefixed → /zh/hello-world
 *   - Root / renders default language content (no redirect)
 */

interface I18nConfig {
  defaultLanguage: string
  languages?: string[]
  basePath: string
}

/** Check if the blog is configured for multi-language */
export function isMultiLang(config: I18nConfig): boolean {
  return (config.languages?.length ?? 0) > 1
}

/** Extract language from a content collection post ID */
export function getPostLang(postId: string, config: I18nConfig): string {
  if (!isMultiLang(config)) return config.defaultLanguage

  const firstSegment = postId.split('/')[0]
  if (firstSegment && config.languages?.includes(firstSegment)) {
    return firstSegment
  }
  return config.defaultLanguage
}

/** Extract slug (without language prefix) from a content collection post ID */
export function getPostSlug(postId: string, config: I18nConfig): string {
  if (!isMultiLang(config)) return postId

  const firstSegment = postId.split('/')[0]
  if (firstSegment && config.languages?.includes(firstSegment)) {
    return postId.slice(firstSegment.length + 1)
  }
  return postId
}

/**
 * Get the URL path for a post.
 * - Single-lang: /{slug}
 * - Multi-lang: default language no prefix, other languages prefixed
 */
export function getPostUrl(postId: string, config: I18nConfig): string {
  const lang = getPostLang(postId, config)
  const slug = getPostSlug(postId, config)
  const base = config.basePath === '/' ? '' : config.basePath

  if (!isMultiLang(config) || lang === config.defaultLanguage) {
    return `${base}/${slug}`
  }
  return `${base}/${lang}/${slug}`
}

/** Build alternate language URLs for a generic page path. */
export function buildAlternateLanguagesForPath(
  pathname: string,
  config: I18nConfig,
): Record<string, string> {
  if (!isMultiLang(config)) return {}

  const base = config.basePath === '/' ? '' : config.basePath
  const languages = config.languages ?? [config.defaultLanguage]
  const langSet = new Set(languages)

  let relative = pathname
  if (base && relative.startsWith(base)) {
    relative = relative.slice(base.length) || '/'
  }
  if (!relative.startsWith('/')) relative = `/${relative}`

  const segments = relative.split('/').filter(Boolean)
  if (segments.length > 0 && langSet.has(segments[0])) {
    const rest = segments.slice(1).join('/')
    relative = rest ? `/${rest}` : '/'
  }

  const isHome = relative === '/' || relative === ''
  const translations: Record<string, string> = {}

  for (const lang of languages) {
    if (isHome) {
      translations[lang] = getLangHomeUrl(lang, config)
      continue
    }
    const suffix =
      lang === config.defaultLanguage ? relative : `/${lang}${relative}`
    translations[lang] = base ? `${base}${suffix}` : suffix
  }

  return translations
}

type TagPostLike = { id: string; data?: { tags?: string[] } }

/** Build alternate language URLs for a tag page, skipping missing tags. */
export function buildAlternateLanguagesForTag(
  tag: string,
  posts: TagPostLike[],
  config: I18nConfig,
): Record<string, string> {
  if (!isMultiLang(config)) return {}

  const translations: Record<string, string> = {}
  const languages = getAllLanguages(config)

  for (const lang of languages) {
    const langPosts = filterPostsByLang(posts, lang, config)
    const hasTag = langPosts.some((post) => (post.data?.tags ?? []).includes(tag))
    if (!hasTag) continue
    translations[lang] = `${getTagsBaseUrl(lang, config)}/${tag}`
  }

  return translations
}

/** Build alternate language URLs for pagination pages, skipping missing pages. */
export function buildAlternateLanguagesForPagination(
  page: number,
  posts: { id: string }[],
  config: I18nConfig,
  postsPerPage: number,
): Record<string, string> {
  if (!isMultiLang(config)) return {}

  const translations: Record<string, string> = {}
  const languages = getAllLanguages(config)

  for (const lang of languages) {
    const langPosts = filterPostsByLang(posts, lang, config)
    const totalPages = Math.ceil(langPosts.length / postsPerPage)
    if (page < 2 || page > totalPages) continue
    translations[lang] = `${getPaginationBaseUrl(lang, config)}/${page}`
  }

  return translations
}

/** Filter posts by language */
export function filterPostsByLang<T extends { id: string }>(
  posts: T[],
  lang: string,
  config: I18nConfig,
): T[] {
  return posts.filter((post) => getPostLang(post.id, config) === lang)
}

/** Get all configured languages */
export function getAllLanguages(config: I18nConfig): string[] {
  if (!isMultiLang(config)) return [config.defaultLanguage]
  return config.languages ?? [config.defaultLanguage]
}

/** Get all non-default languages (for prefixed routes). */
export function getNonDefaultLanguages(config: I18nConfig): string[] {
  if (!isMultiLang(config)) return []
  const languages = config.languages ?? [config.defaultLanguage]
  return languages.filter((lang) => lang !== config.defaultLanguage)
}

/** Find translations of a post across languages */
export function getTranslations(
  postId: string,
  allPosts: { id: string }[],
  config: I18nConfig,
): Record<string, string> {
  if (!isMultiLang(config)) return {}

  const slug = getPostSlug(postId, config)
  const translations: Record<string, string> = {}

  for (const post of allPosts) {
    if (getPostSlug(post.id, config) === slug) {
      const lang = getPostLang(post.id, config)
      translations[lang] = getPostUrl(post.id, config)
    }
  }

  return translations
}

/**
 * Get the home URL for a language.
 * - Single-lang: /
 * - Multi-lang: /{lang}/
 */
export function getLangHomeUrl(lang: string, config: I18nConfig): string {
  const base = config.basePath === '/' ? '' : config.basePath
  if (!isMultiLang(config) || lang === config.defaultLanguage) return base || '/'
  return `${base}/${lang}/`
}

/** Get the tags base URL for a language */
export function getTagsBaseUrl(lang: string, config: I18nConfig): string {
  const base = config.basePath === '/' ? '' : config.basePath
  if (!isMultiLang(config) || lang === config.defaultLanguage) return `${base}/tags`
  return `${base}/${lang}/tags`
}

/** Get the RSS URL for a language */
export function getRssUrl(lang: string, config: I18nConfig): string {
  const base = config.basePath === '/' ? '' : config.basePath
  if (!isMultiLang(config) || lang === config.defaultLanguage) return `${base}/rss.xml`
  return `${base}/${lang}/rss.xml`
}

/** Get the pagination base URL for a language */
export function getPaginationBaseUrl(lang: string, config: I18nConfig): string {
  const base = config.basePath === '/' ? '' : config.basePath
  if (!isMultiLang(config) || lang === config.defaultLanguage) return `${base}/page`
  return `${base}/${lang}/page`
}
