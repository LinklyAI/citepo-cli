import { describe, it, expect } from 'vitest'
import { generateBlogJsonSchema } from './schema.js'

/** Extract the BlogConfig definition from the generated schema */
function getBlogConfigDef(): Record<string, unknown> {
  const schema = generateBlogJsonSchema()
  // zod-to-json-schema wraps named schemas in definitions
  const definitions = schema.definitions as Record<string, Record<string, unknown>> | undefined
  return definitions?.BlogConfig ?? schema
}

describe('generateBlogJsonSchema', () => {
  it('should return a valid JSON Schema object', () => {
    const def = getBlogConfigDef()

    expect(def).toBeDefined()
    expect(def.type).toBe('object')
  })

  it('should include name as a required field', () => {
    const def = getBlogConfigDef()

    const required = def.required as string[] | undefined
    expect(required).toContain('name')
  })

  it('should include correct defaultLanguage enum values', () => {
    const def = getBlogConfigDef()

    const properties = def.properties as Record<string, Record<string, unknown>>
    expect(properties).toBeDefined()

    const defaultLang = properties.defaultLanguage!
    expect(defaultLang).toBeDefined()

    const enumValues = defaultLang.enum as string[]
    expect(enumValues).toContain('en')
    expect(enumValues).toContain('zh')
    expect(enumValues).toContain('ja')
  })

  it('should have properties for key config fields', () => {
    const def = getBlogConfigDef()
    const properties = def.properties as Record<string, unknown>

    expect(properties).toBeDefined()
    expect(properties.name).toBeDefined()
    expect(properties.description).toBeDefined()
    expect(properties.theme).toBeDefined()
    expect(properties.basePath).toBeDefined()
    expect(properties.rss).toBeDefined()
    expect(properties.sitemap).toBeDefined()
    expect(properties.postsPerPage).toBeDefined()
  })
})
