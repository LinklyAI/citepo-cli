import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { loadBlogConfig, normalizeBasePath, type BlogConfig } from '../config.js'
import { detectLang, parseFrontmatter, toEntryId } from '../content.js'
import { PostFrontmatterSchema } from '../frontmatter.js'
import { HOSTED_LIMITS, LIMIT_WARNING_RATIO } from '../limits.js'
import { CONTENT_IMAGES_DIR } from '../remark-relative-images.js'
import { scanMdxContent } from '../security.js'
import { postPathWithoutBase } from '../sitemap.js'
import { analyzeMdx, MDX_COMPONENT_NAMES, type MdxReference } from './mdx.js'

/**
 * `citepo check`: everything that can be verified without building the site.
 * Each issue names a rule, a file and line, and how to fix it, so both people and
 * agents can act on the report directly.
 */

export type CheckSeverity = 'error' | 'warning' | 'info'

export interface CheckIssue {
  /** Stable rule id, e.g. "missing_image". */
  rule: string
  severity: CheckSeverity
  message: string
  /** Path relative to the project root, e.g. "content/zh/hello.mdx". */
  file?: string
  line?: number
  hint?: string
  /** Extra lines, e.g. the files behind a project-level issue. */
  details?: string[]
}

export interface CheckReport {
  /** True when there are no errors (warnings and info are allowed). */
  passed: boolean
  posts: number
  drafts: number
  languages: string[]
  /** Size of content/ and asset/, the part of the repository the builder downloads. */
  sourceBytes: number
  summary: { errors: number; warnings: number; info: number }
  issues: CheckIssue[]
}

/** Source images above this size are reported (the build output is optimized anyway). */
export const LARGE_IMAGE_BYTES = 1024 * 1024

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.avif',
])
const SKIPPED_SCHEMES = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i

interface PostRecord {
  file: string
  absolutePath: string
  urlPath: string
  lang: string
  draft: boolean
  tags: string[]
  links: MdxReference[]
}

export interface CheckOptions {
  /** Path the blog is served under when it differs from blog.json (like `build --base-path`). */
  basePath?: string
}

export async function runCheck(
  projectDir: string,
  options: CheckOptions = {},
): Promise<CheckReport> {
  const config = await loadBlogConfig(projectDir)
  if (options.basePath) config.basePath = normalizeBasePath(options.basePath)
  const contentDir = path.join(projectDir, 'content')
  const assetDir = path.join(projectDir, 'asset')
  const issues: CheckIssue[] = []
  const posts: PostRecord[] = []
  const largeImages = new Map<string, number>()

  const mdxFiles = existsSync(contentDir)
    ? (await readdir(contentDir, { recursive: true })).map(String).filter((f) => f.endsWith('.mdx'))
    : []
  mdxFiles.sort()

  if (mdxFiles.length === 0) {
    issues.push({
      rule: 'no_posts',
      severity: 'warning',
      message: 'No posts found in content/',
      hint: 'Create one with `citepo post new "My first post"`.',
    })
  }

  for (const relative of mdxFiles) {
    const absolutePath = path.join(contentDir, relative)
    const file = toPosix(path.join('content', relative))
    const raw = await readFile(absolutePath, 'utf-8')
    const record = await checkPost({
      config,
      projectDir,
      assetDir,
      file,
      absolutePath,
      relative,
      raw,
      issues,
      largeImages,
    })
    if (record) posts.push(record)
  }

  checkDuplicateUrls(posts, issues)
  checkLinks(config, projectDir, assetDir, posts, issues)
  checkTags(posts, issues)
  checkTranslations(config, posts, issues)
  const sourceBytes = await checkSourceSize(projectDir, issues, largeImages)

  const summary = {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
  }
  return {
    passed: summary.errors === 0,
    posts: posts.filter((p) => !p.draft).length,
    drafts: posts.filter((p) => p.draft).length,
    languages:
      config.languages && config.languages.length > 1 ? config.languages : [config.defaultLanguage],
    sourceBytes,
    summary,
    issues: sortIssues(issues),
  }
}

interface CheckPostInput {
  config: BlogConfig
  projectDir: string
  assetDir: string
  file: string
  absolutePath: string
  relative: string
  raw: string
  issues: CheckIssue[]
  largeImages: Map<string, number>
}

async function checkPost(input: CheckPostInput): Promise<PostRecord | undefined> {
  const { config, projectDir, assetDir, file, absolutePath, relative, raw, issues, largeImages } =
    input

  for (const issue of scanMdxContent(raw, file)) {
    issues.push({
      rule: 'unsafe_mdx',
      severity: issue.severity,
      message: issue.message,
      file,
      line: issue.line,
      hint: 'Posts cannot contain scripts, imports, exports or event handlers; remove it.',
    })
  }

  const parsed = parseFrontmatter(raw)
  if (!parsed) {
    issues.push({
      rule: 'missing_frontmatter',
      severity: 'error',
      message: 'The post has no frontmatter',
      file,
      line: 1,
      hint: 'Start the file with a --- block containing title, description and date. See `citepo docs frontmatter`.',
    })
    return undefined
  }

  const result = PostFrontmatterSchema.safeParse(parsed.frontmatter)
  if (!result.success) {
    for (const zodIssue of result.error.issues) {
      const key = String(zodIssue.path[0] ?? '')
      issues.push({
        rule: 'invalid_frontmatter',
        severity: 'error',
        message: `${zodIssue.path.join('.') || 'frontmatter'}: ${zodIssue.message}`,
        file,
        line: frontmatterLine(raw, key),
        hint: 'See `citepo docs frontmatter` for every field and its format.',
      })
    }
  }
  const fm = result.success ? result.data : undefined
  if (fm && !fm.description.trim()) {
    issues.push({
      rule: 'empty_description',
      severity: 'warning',
      message: 'description is empty; search results and share cards show it',
      file,
      line: frontmatterLine(raw, 'description'),
      hint: 'Write one or two sentences that summarize the post.',
    })
  }

  const analysis = await analyzeMdx(raw)
  if (analysis.syntaxError) {
    issues.push({
      rule: 'mdx_syntax',
      severity: 'error',
      message: `MDX does not parse: ${analysis.syntaxError.message}`,
      file,
      line: analysis.syntaxError.line,
      hint: 'Common causes: an unclosed tag, or { < > in text (escape them as \\{ &lt; &gt;).',
    })
  }
  for (const component of analysis.unknownComponents) {
    issues.push({
      rule: 'unknown_component',
      severity: 'error',
      message: `Unknown component <${component.name}>`,
      file,
      line: component.line,
      hint: `Available components: ${MDX_COMPONENT_NAMES.join(', ')}. See \`citepo docs components\`.`,
    })
  }

  const mdxDir = path.dirname(absolutePath)
  const images = [...analysis.images]
  // Read the raw values, so images are checked even when other fields are invalid
  for (const key of ['coverImage', 'ogImage'] as const) {
    const value = parsed.frontmatter[key]
    if (typeof value === 'string' && value)
      images.push({ url: value, line: frontmatterLine(raw, key) })
  }
  for (const image of images) {
    const target = resolveSourceImage(image.url, mdxDir, assetDir, config.basePath)
    if (!target) continue
    if (!existsSync(target)) {
      issues.push({
        rule: 'missing_image',
        severity: 'error',
        message: `Image not found: ${image.url}`,
        file,
        line: image.line,
        hint: `Expected the file at ${toPosix(path.relative(projectDir, target))}. Add it there, or fix the path.`,
      })
      continue
    }
    const size = (await stat(target)).size
    if (size > LARGE_IMAGE_BYTES) largeImages.set(toPosix(path.relative(projectDir, target)), size)
  }

  const id = fm?.slug || toEntryId(relative)
  const lang = detectLang(id, config.defaultLanguage, config.languages)
  return {
    file,
    absolutePath,
    urlPath: postPathWithoutBase({ slug: id, lang }, config),
    lang,
    draft: fm?.draft ?? false,
    tags: fm?.tags ?? [],
    links: analysis.links,
  }
}

function checkDuplicateUrls(posts: PostRecord[], issues: CheckIssue[]): void {
  const byUrl = new Map<string, PostRecord>()
  for (const post of posts) {
    const key = post.urlPath.toLowerCase()
    const first = byUrl.get(key)
    if (!first) {
      byUrl.set(key, post)
      continue
    }
    issues.push({
      rule: 'duplicate_url',
      severity: 'error',
      message: `Same URL ${post.urlPath} as ${first.file}`,
      file: post.file,
      line: 1,
      hint: 'Rename one of the files, or give one a different `slug` in its frontmatter.',
    })
  }
}

function checkLinks(
  config: BlogConfig,
  projectDir: string,
  assetDir: string,
  posts: PostRecord[],
  issues: CheckIssue[],
): void {
  const base = config.basePath === '/' ? '' : config.basePath
  const languages = config.languages && config.languages.length > 1 ? config.languages : []
  const known = new Set<string>([
    '/',
    '/rss.xml',
    '/llms.txt',
    '/llms-full.txt',
    '/skill.md',
    '/sitemap-index.xml',
  ])
  for (const lang of languages) {
    known.add(`/${lang}`)
    known.add(`/${lang}/rss.xml`)
  }
  for (const post of posts) {
    if (post.draft) continue
    known.add(post.urlPath)
    known.add(`${post.urlPath}.md`)
  }
  const langPrefix = languages.length > 0 ? `(?:/(?:${languages.join('|')}))?` : ''
  const generated = new RegExp(`^${langPrefix}/(?:tags(?:/.*)?|page/\\d+|og/.+\\.png)$`)
  const isKnown = (relative: string) =>
    known.has(relative) || generated.test(relative) || existsSync(path.join(assetDir, relative))
  // Links like /blog/post in a blog whose blog.json says basePath "/": the hosted site
  // probably serves it under /blog. Reported once instead of once per link.
  const prefixedLinks = new Map<string, number>()

  for (const post of posts) {
    for (const link of post.links) {
      const url = link.url.trim()
      if (!url || SKIPPED_SCHEMES.test(url)) continue
      const pathname = url.split(/[?#]/)[0]!

      if (!pathname.startsWith('/')) {
        if (!/\.mdx?$/i.test(pathname)) continue
        const target = path.resolve(path.dirname(post.absolutePath), safeDecode(pathname))
        const linked = posts.find((p) => p.absolutePath === target)
        issues.push(
          linked
            ? {
                rule: 'source_link',
                severity: 'warning',
                message: `Link to a source file (${url}) does not work on the site`,
                file: post.file,
                line: link.line,
                hint: `Link to the post URL instead: ${base}${linked.urlPath}`,
              }
            : {
                rule: 'broken_link',
                severity: 'error',
                message: `Linked file not found: ${url}`,
                file: post.file,
                line: link.line,
                hint: `Expected ${toPosix(path.relative(projectDir, target))}.`,
              },
        )
        continue
      }

      // With a basePath, links outside it point to the parent site and cannot be checked
      if (base && pathname !== base && !pathname.startsWith(`${base}/`)) continue
      const relative = safeDecode(pathname.slice(base.length)).replace(/\/+$/, '') || '/'
      if (isKnown(relative)) continue
      const prefix = /^\/[^/]+/.exec(relative)?.[0]
      const rest = prefix ? relative.slice(prefix.length) : ''
      if (!base && prefix && rest && isKnown(rest)) {
        prefixedLinks.set(prefix, (prefixedLinks.get(prefix) ?? 0) + 1)
        continue
      }

      issues.push({
        rule: 'broken_link',
        severity: 'warning',
        message: `No page or file at ${url}`,
        file: post.file,
        line: link.line,
        hint: 'Check the slug (`citepo post list` shows every post URL). Drafts are not published.',
      })
    }
  }

  for (const [prefix, count] of prefixedLinks) {
    issues.push({
      rule: 'base_path_links',
      severity: 'info',
      message: `${count} link(s) start with ${prefix}/ while blog.json has basePath "/"`,
      hint: `If the site is served under ${prefix}, check them with \`citepo check --base-path ${prefix}\`.`,
    })
  }
}

function checkTags(posts: PostRecord[], issues: CheckIssue[]): void {
  const variants = new Map<string, Map<string, number>>()
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = tag.trim().toLowerCase()
      const counts = variants.get(key) ?? new Map<string, number>()
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
      variants.set(key, counts)
    }
  }
  for (const counts of variants.values()) {
    if (counts.size < 2) continue
    const spellings = [...counts.entries()].map(([tag, n]) => `${tag} (${n})`)
    issues.push({
      rule: 'tag_case',
      severity: 'warning',
      message: `Tags differ only in case or spacing: ${spellings.join(', ')}`,
      hint: 'Use one spelling so the posts share one tag page. `citepo tag list` shows every tag.',
    })
  }
}

function checkTranslations(config: BlogConfig, posts: PostRecord[], issues: CheckIssue[]): void {
  const languages = config.languages ?? []
  if (languages.length < 2) return

  const groups = new Map<string, PostRecord[]>()
  for (const post of posts) {
    if (post.draft) continue
    const key = post.urlPath.replace(new RegExp(`^/(?:${languages.join('|')})(?=/)`), '')
    groups.set(key, [...(groups.get(key) ?? []), post])
  }
  for (const [key, group] of groups) {
    const present = new Set(group.map((p) => p.lang))
    const missing = languages.filter((lang) => !present.has(lang))
    if (missing.length === 0) continue
    issues.push({
      rule: 'missing_translation',
      severity: 'info',
      message: `No ${missing.join(', ')} version of ${key}`,
      file: group[0]!.file,
      hint: `Translate it into ${missing.map((l) => `content/${l}${key}.mdx`).join(', ')}.`,
    })
  }
}

async function checkSourceSize(
  projectDir: string,
  issues: CheckIssue[],
  largeImages: Map<string, number>,
): Promise<number> {
  let total = 0
  for (const dir of ['content', 'asset']) {
    const root = path.join(projectDir, dir)
    if (!existsSync(root)) continue
    for (const entry of (await readdir(root, { recursive: true })).map(String)) {
      if (entry.startsWith(CONTENT_IMAGES_DIR)) continue
      const info = await stat(path.join(root, entry))
      if (!info.isFile()) continue
      total += info.size
      if (info.size > HOSTED_LIMITS.fileBytes) {
        issues.push({
          rule: 'file_too_large',
          severity: IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase()) ? 'warning' : 'error',
          message: `${toPosix(path.join(dir, entry))} is ${mb(info.size)}; hosted builds accept files up to ${mb(HOSTED_LIMITS.fileBytes)}`,
          hint: 'Shrink it (`citepo image optimize` for images) or host it elsewhere and link to it.',
        })
      }
    }
  }

  const nearLimit = total >= HOSTED_LIMITS.repoBytes * LIMIT_WARNING_RATIO
  if (total > HOSTED_LIMITS.repoBytes || nearLimit) {
    issues.push({
      rule: 'source_too_large',
      severity: total > HOSTED_LIMITS.repoBytes ? 'error' : 'warning',
      message: `content/ and asset/ are ${mb(total)}; hosted builds download at most ${mb(HOSTED_LIMITS.repoBytes)}`,
      hint: 'Run `citepo image optimize` to shrink the images in place.',
    })
  }

  if (largeImages.size > 0) {
    const sorted = [...largeImages.entries()].sort((a, b) => b[1] - a[1])
    const sum = sorted.reduce((acc, [, size]) => acc + size, 0)
    issues.push({
      rule: 'large_images',
      severity: nearLimit ? 'warning' : 'info',
      message: `${sorted.length} image(s) over ${mb(LARGE_IMAGE_BYTES)}, ${mb(sum)} in total`,
      hint: 'The build scales them down automatically; `citepo image optimize` also shrinks the source files.',
      details: sorted.slice(0, 10).map(([file, size]) => `${file} (${mb(size)})`),
    })
  }
  return total
}

/**
 * Where a referenced image lives in the project, or null for external URLs.
 * Mirrors the build: "/x" and "images/x" are served from asset/, other paths are
 * relative to the post.
 */
export function resolveSourceImage(
  url: string,
  mdxDir: string,
  assetDir: string,
  basePath: string,
): string | null {
  const trimmed = url.trim()
  if (!trimmed || SKIPPED_SCHEMES.test(trimmed)) return null
  const pathname = safeDecode(trimmed.split(/[?#]/)[0]!)
  if (!IMAGE_EXTENSIONS.has(path.extname(pathname).toLowerCase())) return null

  const base = basePath === '/' ? '' : basePath
  if (pathname.startsWith('/')) {
    const relative =
      base && pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname
    return path.join(assetDir, relative)
  }
  if (pathname.startsWith('images/')) return path.join(assetDir, pathname)
  return path.resolve(mdxDir, pathname)
}

/** 1-based line of a top-level frontmatter key, or 1 when it is absent. */
export function frontmatterLine(raw: string, key: string): number {
  if (!key) return 1
  const lines = raw.split('\n')
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') break
    if (new RegExp(`^${key}\\s*:`).test(lines[i]!)) return i + 1
  }
  return 1
}

const SEVERITY_ORDER: Record<CheckSeverity, number> = { error: 0, warning: 1, info: 2 }

function sortIssues(issues: CheckIssue[]): CheckIssue[] {
  return [...issues].sort(
    (a, b) =>
      (a.file ?? '~').localeCompare(b.file ?? '~') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )
}

function safeDecode(value: string): string {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
