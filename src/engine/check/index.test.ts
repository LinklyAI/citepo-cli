import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { frontmatterLine, resolveSourceImage, runCheck, type CheckReport } from './index.js'

const post = (fields: string, body = 'Hello') => `---\n${fields}\n---\n\n${body}\n`

describe('runCheck', () => {
  let dir: string

  async function write(file: string, content: string | Buffer) {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true })
    await writeFile(path.join(dir, file), content)
  }

  const rules = (report: CheckReport) =>
    report.issues.map((i) => `${i.severity}:${i.rule}:${i.file ?? ''}:${i.line ?? ''}`)

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'citepo-check-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('passes a clean single-language blog', async () => {
    await write('blog.json', JSON.stringify({ name: 'Blog' }))
    await write('asset/images/a.png', 'png')
    await write(
      'content/hello.mdx',
      post(
        'title: Hello\ndescription: Hi\ndate: 2026-01-01',
        '![a](/images/a.png)\n\n[other](/second)',
      ),
    )
    await write('content/second.mdx', post('title: Second\ndescription: Hi\ndate: 2026-01-02'))

    const report = await runCheck(dir)
    expect(report.issues).toEqual([])
    expect(report).toMatchObject({ passed: true, posts: 2, drafts: 0, languages: ['en'] })
  })

  it('reports frontmatter, MDX, image and link problems with locations', async () => {
    await write('blog.json', JSON.stringify({ name: 'Blog' }))
    await write(
      'content/bad.mdx',
      post(
        'title: Bad\ndescription: ""\ndate: not a date\ncoverImage: ./missing.png',
        '<Foo />\n\n![x](images/nope.png)\n\n[gone](/no-such-post)\n\n[src](./other.mdx)',
      ),
    )
    await write('content/other.mdx', post('title: Other\ndescription: Hi\ndate: 2026-01-01'))
    await write(
      'content/broken.mdx',
      post('title: Broken\ndescription: Hi\ndate: 2026-01-01', 'text {oops'),
    )
    await write('content/nofm.mdx', '# No frontmatter')

    const report = await runCheck(dir)
    expect(report.passed).toBe(false)
    expect(rules(report)).toEqual(
      expect.arrayContaining([
        'error:invalid_frontmatter:content/bad.mdx:4',
        'error:missing_image:content/bad.mdx:5',
        'error:unknown_component:content/bad.mdx:8',
        'error:missing_image:content/bad.mdx:10',
        'warning:broken_link:content/bad.mdx:12',
        'warning:source_link:content/bad.mdx:14',
        'error:mdx_syntax:content/broken.mdx:7',
        'error:missing_frontmatter:content/nofm.mdx:1',
      ]),
    )
    const sourceLink = report.issues.find((i) => i.rule === 'source_link')
    expect(sourceLink?.hint).toContain('/other')
  })

  it('finds tag spelling variants, missing translations and duplicate URLs', async () => {
    await write(
      'blog.json',
      JSON.stringify({ name: 'Blog', defaultLanguage: 'en', languages: ['en', 'zh'] }),
    )
    await write(
      'content/en/a.mdx',
      post('title: A\ndescription: x\ndate: 2026-01-01\ntags: [Release]'),
    )
    await write(
      'content/en/b.mdx',
      post('title: B\ndescription: x\ndate: 2026-01-01\ntags: [release]\nslug: en/a'),
    )
    await write('content/zh/a.mdx', post('title: A\ndescription: x\ndate: 2026-01-01'))

    const report = await runCheck(dir)
    expect(rules(report)).toEqual(
      expect.arrayContaining(['warning:tag_case::', 'error:duplicate_url:content/en/b.mdx:1']),
    )
    expect(report.issues.some((i) => i.rule === 'missing_translation')).toBe(false)

    await write('content/en/c.mdx', post('title: C\ndescription: x\ndate: 2026-01-01'))
    const second = await runCheck(dir)
    const missing = second.issues.find((i) => i.rule === 'missing_translation')
    expect(missing).toMatchObject({ severity: 'info', file: 'content/en/c.mdx' })
    expect(missing?.message).toContain('zh')
  })

  it('accepts links under the base path and reports base path mismatches once', async () => {
    await write('blog.json', JSON.stringify({ name: 'Blog' }))
    await write(
      'content/a.mdx',
      post('title: A\ndescription: x\ndate: 2026-01-01', '[b](/blog/b) [c](/blog/b)'),
    )
    await write('content/b.mdx', post('title: B\ndescription: x\ndate: 2026-01-01'))

    const plain = await runCheck(dir)
    expect(rules(plain)).toEqual(['info:base_path_links::'])
    expect(plain.issues[0]?.message).toContain('2 link(s)')

    const withBase = await runCheck(dir, { basePath: '/blog' })
    expect(withBase.issues).toEqual([])
  })
})

describe('runCheck image and link edge cases', () => {
  let dir: string
  const write = async (file: string, content: string) => {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true })
    await writeFile(path.join(dir, file), content)
  }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'citepo-check-edge-'))
    await write('blog.json', JSON.stringify({ name: 'Blog' }))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('flags relative <img src>, wrong letter case and images outside the project', async () => {
    await write('asset/images/Photo.png', 'png')
    await write(
      'content/a.mdx',
      post(
        'title: A\ndescription: x\ndate: 2026-01-01',
        [
          '<img src="./x.png" />',
          '',
          '![case](/images/photo.png)',
          '',
          '![outside](../../outside.png)',
        ].join('\n'),
      ),
    )
    const report = await runCheck(dir)
    expect(report.issues.map((i) => `${i.rule}:${i.line}`)).toEqual(
      expect.arrayContaining(['relative_img_src:7', 'missing_image:9', 'image_outside_project:11']),
    )
  })

  it('reports a single prefixed link as broken, not as a base path', async () => {
    await write('content/a.mdx', post('title: A\ndescription: x\ndate: 2026-01-01', '[b](/foo/b)'))
    await write('content/b.mdx', post('title: B\ndescription: x\ndate: 2026-01-01'))
    const report = await runCheck(dir)
    expect(report.issues.map((i) => i.rule)).toEqual(['broken_link'])
  })

  it('knows generated pages and respects the config flags', async () => {
    await write(
      'blog.json',
      JSON.stringify({
        name: 'Blog',
        defaultLanguage: 'en',
        languages: ['en', 'zh'],
        skillMd: false,
      }),
    )
    await write(
      'content/en/a.mdx',
      post(
        'title: A\ndescription: x\ndate: 2026-01-01',
        '[1](/zh/llms.txt) [2](/404) [3](/en) [4](/skill.md)',
      ),
    )
    await write('content/zh/a.mdx', post('title: A\ndescription: x\ndate: 2026-01-01'))
    const report = await runCheck(dir)
    expect(report.issues.filter((i) => i.rule === 'broken_link').map((i) => i.message)).toEqual([
      'No page or file at /en',
      'No page or file at /skill.md',
    ])
  })
})

describe('resolveSourceImage', () => {
  const asset = '/p/asset'
  it('maps URLs the way the build serves them', () => {
    expect(resolveSourceImage('/images/a.png', '/p/content', asset, '/')).toBe(
      '/p/asset/images/a.png',
    )
    expect(resolveSourceImage('/blog/images/a.png', '/p/content', asset, '/blog')).toBe(
      '/p/asset/images/a.png',
    )
    expect(resolveSourceImage('images/a.png', '/p/content/zh', asset, '/')).toBe(
      '/p/asset/images/a.png',
    )
    expect(resolveSourceImage('./a.png', '/p/content/zh', asset, '/')).toBe('/p/content/zh/a.png')
    expect(resolveSourceImage('https://x.com/a.png', '/p/content', asset, '/')).toBeNull()
    expect(resolveSourceImage('/doc.pdf', '/p/content', asset, '/')).toBeNull()
  })
})

describe('frontmatterLine', () => {
  it('finds top-level keys only inside the frontmatter', () => {
    const raw = '---\ntitle: x\ndate: y\n---\ndate: not this'
    expect(frontmatterLine(raw, 'date')).toBe(3)
    expect(frontmatterLine(raw, 'missing')).toBe(1)
  })
})
