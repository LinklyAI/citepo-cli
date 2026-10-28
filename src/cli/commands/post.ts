import { Command } from 'commander'
import { loadBlogConfig } from '../../engine/config.js'
import {
  createPost,
  isMultiLanguage,
  listPosts,
  PostExistsError,
  type NewPostFile,
  type PostSummary,
} from '../../engine/posts.js'
import { CliError } from '../error.js'
import { displayWidth, mark, renderTable, style } from '../output.js'
import { action } from '../run.js'
import { toKebabCase } from './init.js'

interface NewPostFlags {
  slug?: string
  lang?: string
  allLangs?: boolean
  description?: string
  tags?: string
  date?: string
  draft?: boolean
}

interface ListFlags {
  lang?: string
  drafts?: boolean
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/

function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const newPostCommand = new Command('new')
  .description('Create a post with frontmatter filled in')
  .argument('<title>', 'post title')
  .option('--slug <slug>', 'URL slug and file name (defaults to the title in kebab-case)')
  .option(
    '--lang <code>',
    'language of the post (multi-language blogs; defaults to the default language)',
  )
  .option('--all-langs', 'create the post in every configured language at once')
  .option('--description <text>', 'one or two sentences for search results and share cards')
  .option('--tags <tags>', 'comma separated tags, e.g. "release,guide"')
  .option('--date <yyyy-mm-dd>', 'publish date (defaults to today)')
  .option('--draft', 'mark as draft: built locally, never published')
  .addHelpText(
    'after',
    `
Examples:
  citepo post new "Hello World"
  citepo post new "你好世界" --slug hello-world --lang zh
  citepo post new "Release 1.2" --all-langs --tags release --draft`,
  )
  .action(
    action(async (_ctx, title: string, flags: NewPostFlags) => {
      const projectDir = process.cwd()
      const config = await loadBlogConfig(projectDir)
      const configured = isMultiLanguage(config)
        ? (config.languages ?? [])
        : [config.defaultLanguage]

      const slug = flags.slug ?? toKebabCase(title)
      if (!slug || !SLUG_PATTERN.test(slug)) {
        throw new CliError({
          code: 'invalid_slug',
          message: slug ? `Invalid slug "${slug}"` : `Cannot derive a slug from "${title}"`,
          expected: 'lowercase letters, numbers and hyphens (e.g. hello-world)',
          hint: `Pass one: citepo post new "${title}" --slug hello-world`,
        })
      }

      const lang = flags.lang ?? config.defaultLanguage
      if (!configured.includes(lang as never)) {
        throw new CliError({
          code: 'invalid_option',
          message: `Language "${lang}" is not configured in blog.json`,
          expected: configured.join(' | '),
        })
      }
      const date = flags.date ?? today()
      // Round-trip the date: new Date('2026-02-30') silently becomes March 2nd
      const parsedDate = new Date(`${date}T00:00:00Z`)
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== date
      ) {
        throw new CliError({
          code: 'invalid_option',
          message: `Invalid date "${date}"`,
          expected: 'YYYY-MM-DD',
        })
      }

      let files: NewPostFile[]
      try {
        files = await createPost(projectDir, config, {
          title,
          slug,
          languages: flags.allLangs ? configured : [lang],
          description: flags.description,
          tags: flags.tags
            ?.split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          date,
          draft: flags.draft,
        })
      } catch (err) {
        if (err instanceof PostExistsError) {
          throw new CliError({
            code: 'post_exists',
            message: `${err.file} already exists`,
            file: err.file,
            hint: 'Edit that file, or choose another slug with --slug.',
          })
        }
        throw err
      }

      return {
        data: { slug, files },
        render: () =>
          [
            '',
            ...files.map(
              (f) => `  ${mark.ok()} Created ${style.bold(f.file)}  ${style.dim(f.url)}`,
            ),
            '',
            `  Next: write the post, then run ${style.cyan('citepo check')}.`,
            '',
          ].join('\n'),
      }
    }),
  )

const listPostsCommand = new Command('list')
  .description('List posts with their URLs, languages and tags')
  .option('--lang <code>', 'only posts in this language')
  .option('--drafts', 'only drafts')
  .action(
    action(async (_ctx, flags: ListFlags) => {
      const projectDir = process.cwd()
      const config = await loadBlogConfig(projectDir)
      const configured = isMultiLanguage(config)
        ? (config.languages ?? [])
        : [config.defaultLanguage]
      if (flags.lang && !configured.includes(flags.lang as never)) {
        throw new CliError({
          code: 'invalid_option',
          message: `Language "${flags.lang}" is not configured in blog.json`,
          expected: configured.join(' | '),
        })
      }
      const posts = (await listPosts(projectDir, config)).filter(
        (p) => (!flags.lang || p.lang === flags.lang) && (!flags.drafts || p.draft),
      )
      return { data: { posts }, render: () => renderPosts(posts, isMultiLanguage(config)) }
    }),
  )

function renderPosts(posts: PostSummary[], multiLang: boolean): string {
  if (posts.length === 0)
    return `\n  No posts yet. Create one with ${style.cyan('citepo post new "Title"')}.\n`
  const headers = [
    'Date',
    ...(multiLang ? ['Lang'] : []),
    'Title',
    'URL',
    ...(multiLang ? ['Missing'] : []),
  ]
  const rows = posts.map((p) => [
    p.date,
    ...(multiLang ? [p.lang] : []),
    (p.draft ? style.yellow('[draft] ') : '') + truncate(p.title, 48),
    style.dim(p.url),
    ...(multiLang ? [p.missingLanguages.join(',')] : []),
  ])
  return `\n${renderTable(headers, rows)}\n\n  ${style.dim(`${posts.length} posts`)}\n`
}

/** Cut text to `max` terminal columns (CJK characters take two). */
function truncate(text: string, max: number): string {
  if (displayWidth(text) <= max) return text
  let out = ''
  for (const char of text) {
    if (displayWidth(out + char) > max - 1) break
    out += char
  }
  return `${out}…`
}

export const postCommand = new Command('post')
  .description('Create and list posts')
  .addCommand(newPostCommand)
  .addCommand(listPostsCommand)
