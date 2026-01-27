import { zodToJsonSchema } from 'zod-to-json-schema'
import { BlogConfigSchema } from './config.js'

/**
 * Generate JSON Schema from the BlogConfigSchema Zod definition.
 * Used to provide $schema support for blog.json files.
 */
export function generateBlogJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(BlogConfigSchema, {
    name: 'BlogConfig',
    $refStrategy: 'none',
  }) as Record<string, unknown>
}
