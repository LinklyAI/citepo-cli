import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateBlogJsonSchema } from './schema.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDir, '..', '..')
const distDir = path.resolve(projectRoot, 'dist')

async function main() {
  const schema = generateBlogJsonSchema()
  const content = JSON.stringify(schema, null, 2) + '\n'

  await mkdir(distDir, { recursive: true })
  const outputPath = path.join(distDir, 'schema.json')
  await writeFile(outputPath, content, 'utf-8')

  console.log(`  JSON Schema written to ${outputPath}`)
}

main().catch((err) => {
  console.error('Failed to generate JSON Schema:', err)
  process.exit(1)
})
