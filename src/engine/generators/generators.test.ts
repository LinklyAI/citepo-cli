import { describe, it, expect } from 'vitest'
import { generateRobotsTxt } from './robots-txt.js'
import { generateLlmsTxt, generateLlmsFullTxt } from './llms-txt.js'
import { generateSkillMd } from './skill-md.js'
import type { BlogConfig } from '../config.js'
import type { PostData } from '../content.js'

// -- Helpers --

function makeConfig(overrides?: Partial<BlogConfig>): BlogConfig {
  return {
    name: 'Test Blog',
    description: 'A test blog',
    theme: 'clean',
    defaultLanguage: 'en',
    basePath: '/',
    rss: true,
    sitemap: true,
    llmsText: true,
    skillMd: true,
    postsPerPage: 10,
    ...overrides,
  }
}

function makePost(overrides?: Partial<PostData>): PostData {
  return {
    slug: 'hello-world',
    title: 'Hello World',
    description: 'A hello world post',
    date: new Date('2025-01-01'),
    tags: ['tech'],
    authors: ['Author'],
    draft: false,
    rawContent: 'Hello world content.',
    lang: 'en',
    ...overrides,
  }
}

// -- robots.txt --

describe('generateRobotsTxt', () => {
  it('should generate basic robots.txt without siteUrl', () => {
    const result = generateRobotsTxt()
    expect(result).toContain('User-agent: *')
    expect(result).toContain('Allow: /')
    expect(result).not.toContain('Sitemap')
  })

  it('should include sitemap when siteUrl is provided', () => {
    const result = generateRobotsTxt('https://example.com')
    expect(result).toContain('Sitemap: https://example.com/sitemap-index.xml')
  })

  it('should include basePath in sitemap when provided', () => {
    const result = generateRobotsTxt('https://example.com', '/blog')
    expect(result).toContain('Sitemap: https://example.com/blog/sitemap-index.xml')
  })
})

// -- llms.txt --

describe('generateLlmsTxt', () => {
  it('should generate basic llms.txt', () => {
    const config = makeConfig()
    const posts = [makePost()]
    const result = generateLlmsTxt(config, posts)

    expect(result).toContain('# Test Blog')
    expect(result).toContain('> A test blog')
    expect(result).toContain('## Blog Posts')
    expect(result).toContain('[Hello World]')
  })

  it('should group posts by language in multi-lang mode', () => {
    const config = makeConfig({ languages: ['en', 'zh'] })
    const posts = [
      makePost({ slug: 'en/hello', title: 'Hello', lang: 'en' }),
      makePost({ slug: 'zh/hello', title: '你好', lang: 'zh' }),
    ]
    const result = generateLlmsTxt(config, posts)

    expect(result).toContain('## Blog Posts (en)')
    expect(result).toContain('## Blog Posts (zh)')
    expect(result).toContain('[Hello]')
    expect(result).toContain('[你好]')
  })

  it('should handle empty posts', () => {
    const config = makeConfig()
    const result = generateLlmsTxt(config, [])

    expect(result).toContain('# Test Blog')
    expect(result).not.toContain('## Blog Posts')
  })

  it('should include siteUrl in post links when provided', () => {
    const config = makeConfig()
    const posts = [makePost()]
    const result = generateLlmsTxt(config, posts, 'https://example.com')

    expect(result).toContain('https://example.com/hello-world')
  })
})

// -- llms-full.txt --

describe('generateLlmsFullTxt', () => {
  it('should include full post content', () => {
    const config = makeConfig()
    const posts = [makePost({ rawContent: 'Full content of the post.' })]
    const result = generateLlmsFullTxt(config, posts)

    expect(result).toContain('# Test Blog')
    expect(result).toContain('## Hello World')
    expect(result).toContain('Full content of the post.')
  })

  it('should separate multiple posts with dividers', () => {
    const config = makeConfig()
    const posts = [
      makePost({ title: 'Post 1', rawContent: 'Content 1' }),
      makePost({ title: 'Post 2', rawContent: 'Content 2' }),
    ]
    const result = generateLlmsFullTxt(config, posts)

    expect(result).toContain('## Post 1')
    expect(result).toContain('## Post 2')
    expect(result).toContain('---')
  })

  it('should handle empty posts', () => {
    const config = makeConfig()
    const result = generateLlmsFullTxt(config, [])

    expect(result).toContain('# Test Blog')
    expect(result).not.toContain('##')
  })
})

// -- skill.md --

describe('generateSkillMd', () => {
  it('should include YAML frontmatter', () => {
    const config = makeConfig()
    const posts = [makePost()]
    const result = generateSkillMd(config, posts)

    // Should start and end with --- delimiters
    expect(result).toMatch(/^---\n/)
    expect(result).toContain('name: "Test Blog"')
    expect(result).toContain('type: blog')
    expect(result).toContain('post_count: 1')
  })

  it('should list posts with dates', () => {
    const config = makeConfig()
    const posts = [makePost({ title: 'My Post', date: new Date('2025-06-15') })]
    const result = generateSkillMd(config, posts)

    expect(result).toContain('**My Post** (2025-06-15)')
  })

  it('should include tag statistics', () => {
    const config = makeConfig()
    const posts = [
      makePost({ tags: ['tech', 'blog'] }),
      makePost({ title: 'Post 2', tags: ['tech'] }),
    ]
    const result = generateSkillMd(config, posts)

    expect(result).toContain('## Tags')
    expect(result).toContain('**tech**: 2 posts')
    expect(result).toContain('**blog**: 1 post')
  })

  it('should include languages in multi-lang mode', () => {
    const config = makeConfig({ languages: ['en', 'zh'] })
    const posts = [makePost()]
    const result = generateSkillMd(config, posts)

    expect(result).toContain('languages: ["en", "zh"]')
  })

  it('should handle empty posts', () => {
    const config = makeConfig()
    const result = generateSkillMd(config, [])

    expect(result).toContain('post_count: 0')
    expect(result).not.toContain('## Posts')
    expect(result).not.toContain('## Tags')
  })
})
