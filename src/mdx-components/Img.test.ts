import { describe, it, expect } from 'vitest'
import { withBasePath } from './Img.js'

describe('withBasePath', () => {
  it('leaves root-absolute paths untouched on a root mount', () => {
    expect(withBasePath('/images/a.png', '/')).toBe('/images/a.png')
  })

  it('prefixes root-absolute paths under a sub path mount', () => {
    expect(withBasePath('/images/v0.5.1/x.png', '/blog')).toBe('/blog/images/v0.5.1/x.png')
  })

  it('normalizes a trailing slash on basePath', () => {
    expect(withBasePath('/images/x.png', '/blog/')).toBe('/blog/images/x.png')
  })

  it('is idempotent — never doubles an already-prefixed path', () => {
    expect(withBasePath('/blog/images/x.png', '/blog')).toBe('/blog/images/x.png')
    expect(withBasePath('/blog', '/blog')).toBe('/blog')
  })

  it('leaves external and protocol-relative URLs untouched', () => {
    expect(withBasePath('https://cdn.example.com/x.png', '/blog')).toBe('https://cdn.example.com/x.png')
    expect(withBasePath('http://cdn.example.com/x.png', '/blog')).toBe('http://cdn.example.com/x.png')
    expect(withBasePath('//cdn.example.com/x.png', '/blog')).toBe('//cdn.example.com/x.png')
  })

  it('leaves non-root-absolute sources untouched (relative paths, data URIs)', () => {
    expect(withBasePath('images/x.png', '/blog')).toBe('images/x.png')
    expect(withBasePath('data:image/png;base64,AAA', '/blog')).toBe('data:image/png;base64,AAA')
  })

  it('passes through empty/undefined sources', () => {
    expect(withBasePath(undefined, '/blog')).toBeUndefined()
    expect(withBasePath('', '/blog')).toBe('')
  })
})
