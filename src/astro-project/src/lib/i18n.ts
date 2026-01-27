/**
 * i18n utility library for multi-language blog routing.
 *
 * Multi-lang detection: `languages` array in blog.json with 2+ items.
 * Content IDs: multi-lang "zh/hello-world", single-lang "hello-world".
 *
 * URL structure:
 *   - Single-lang: no language prefix → /hello-world
 *   - Multi-lang: ALL languages prefixed → /zh/hello-world, /en/hello-world
 *   - Root / in multi-lang → redirect to /{defaultLang}/
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
 * - Multi-lang: /{lang}/{slug} (ALL languages prefixed)
 */
export function getPostUrl(postId: string, config: I18nConfig): string {
  const lang = getPostLang(postId, config)
  const slug = getPostSlug(postId, config)
  const base = config.basePath === '/' ? '' : config.basePath

  if (!isMultiLang(config)) {
    return `${base}/${slug}`
  }
  return `${base}/${lang}/${slug}`
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
  if (!isMultiLang(config)) return base || '/'
  return `${base}/${lang}/`
}

/** Get the tags base URL for a language */
export function getTagsBaseUrl(lang: string, config: I18nConfig): string {
  const base = config.basePath === '/' ? '' : config.basePath
  if (!isMultiLang(config)) return `${base}/tags`
  return `${base}/${lang}/tags`
}

/** Get the RSS URL for a language */
export function getRssUrl(lang: string, config: I18nConfig): string {
  const base = config.basePath === '/' ? '' : config.basePath
  if (!isMultiLang(config)) return `${base}/rss.xml`
  return `${base}/${lang}/rss.xml`
}

/** Get the pagination base URL for a language */
export function getPaginationBaseUrl(lang: string, config: I18nConfig): string {
  const base = config.basePath === '/' ? '' : config.basePath
  if (!isMultiLang(config)) return `${base}/page`
  return `${base}/${lang}/page`
}
