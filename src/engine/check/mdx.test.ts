import { describe, expect, it } from 'vitest'
import { analyzeMdx, blankFrontmatter, MDX_COMPONENT_NAMES } from './mdx.js'
import { readFileSync } from 'node:fs'

describe('blankFrontmatter', () => {
  it('keeps line numbers', () => {
    const out = blankFrontmatter('---\ntitle: x\n---\nbody')
    expect(out).toBe('\n\n\nbody')
  })

  it('leaves files without frontmatter alone', () => {
    expect(blankFrontmatter('# hi')).toBe('# hi')
  })
})

describe('analyzeMdx', () => {
  it('collects images, links and unknown components with lines', async () => {
    const source = [
      '---',
      'title: x',
      '---',
      '![a](./a.png)',
      '',
      '<Callout>ok</Callout>',
      '',
      '<Foo />',
      '',
      '[l](/blog/x)',
      '',
      '<Card href="/y" />',
      '',
      '<img src="/images/b.png" />',
    ].join('\n')
    const result = await analyzeMdx(source)
    expect(result.syntaxError).toBeUndefined()
    expect(result.images).toEqual([
      { url: './a.png', line: 4 },
      { url: '/images/b.png', line: 14, jsx: true },
    ])
    expect(result.links).toEqual([
      { url: '/blog/x', line: 10 },
      { url: '/y', line: 12 },
    ])
    expect(result.unknownComponents).toEqual([{ name: 'Foo', line: 8 }])
  })

  it('resolves reference-style images and links', async () => {
    const result = await analyzeMdx(
      '![a][pic]\n\n[b][page]\n\n[pic]: /images/a.png\n[page]: /hello\n',
    )
    expect(result.images).toEqual([{ url: '/images/a.png', line: 1 }])
    expect(result.links).toEqual([{ url: '/hello', line: 3 }])
  })

  it('reports syntax errors with a line', async () => {
    const result = await analyzeMdx('---\ntitle: x\n---\n\nhello {oops\n')
    expect(result.syntaxError?.line).toBeGreaterThanOrEqual(5)
    expect(result.syntaxError?.message).toBeTruthy()
  })

  it('lists every registered component', () => {
    // Read the export list as text: the components themselves need the Astro aliases
    const index = readFileSync(new URL('../../mdx-components/index.ts', import.meta.url), 'utf-8')
    const exported = [...index.matchAll(/export \{([^}]+)\}/g)]
      .flatMap((m) => m[1]!.split(','))
      .map((name) => name.trim())
      .filter((name) => /^[A-Z]/.test(name))
    expect([...MDX_COMPONENT_NAMES].sort()).toEqual(exported.sort())
  })
})
