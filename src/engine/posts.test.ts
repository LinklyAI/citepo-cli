import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { validateBlogConfig } from './config.js'
import { createPost, listPosts, PostExistsError, renderNewPost, summarizeTags } from './posts.js'

const multi = validateBlogConfig({
  name: 'Blog',
  basePath: '/blog',
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
})
const single = validateBlogConfig({ name: 'Blog' })

describe('posts', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'citepo-posts-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('creates one file per language with URLs', async () => {
    const files = await createPost(dir, multi, {
      title: 'Hello: "World"',
      slug: 'hello',
      languages: ['en', 'zh'],
      tags: ['news'],
      date: '2026-01-02',
    })
    expect(files).toEqual([
      { lang: 'en', file: 'content/en/hello.mdx', url: '/blog/hello' },
      { lang: 'zh', file: 'content/zh/hello.mdx', url: '/blog/zh/hello' },
    ])
    const text = await readFile(path.join(dir, 'content/zh/hello.mdx'), 'utf-8')
    expect(text).toContain('title: "Hello: \\"World\\""')
    expect(text).toContain('tags: ["news"]')

    await expect(
      createPost(dir, multi, { title: 'x', slug: 'hello', languages: ['zh'], date: '2026-01-02' }),
    ).rejects.toBeInstanceOf(PostExistsError)
  })

  it('lists posts with translations and drafts, newest first', async () => {
    await createPost(dir, multi, {
      title: 'A',
      slug: 'a',
      languages: ['en', 'zh'],
      date: '2026-01-01',
      tags: ['AI'],
    })
    await createPost(dir, multi, {
      title: 'B',
      slug: 'b',
      languages: ['en'],
      date: '2026-02-01',
      tags: ['ai'],
      draft: true,
    })

    const posts = await listPosts(dir, multi)
    expect(posts.map((p) => [p.file, p.url, p.draft, p.missingLanguages])).toEqual([
      ['content/en/b.mdx', '/blog/b', true, ['zh']],
      ['content/en/a.mdx', '/blog/a', false, []],
      ['content/zh/a.mdx', '/blog/zh/a', false, []],
    ])
  })

  it('summarizes tags of published posts and flags spelling variants', async () => {
    await mkdir(path.join(dir, 'content'), { recursive: true })
    await writeFile(
      path.join(dir, 'content/a.mdx'),
      renderNewPost({ title: 'A', date: '2026-01-01', tags: ['AI', 'Go'] }),
    )
    await writeFile(
      path.join(dir, 'content/b.mdx'),
      renderNewPost({ title: 'B', date: '2026-01-02', tags: ['ai'] }),
    )
    const tags = summarizeTags(await listPosts(dir, single))
    expect(tags).toHaveLength(3)
    expect(tags).toEqual(
      expect.arrayContaining([
        { tag: 'AI', count: 1, variants: ['ai'] },
        { tag: 'ai', count: 1, variants: ['AI'] },
        { tag: 'Go', count: 1, variants: [] },
      ]),
    )
  })
})
