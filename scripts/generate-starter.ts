/**
 * Generate a complete citepo-blog-starter template project.
 *
 * Output matches `citepo new` with three languages (en, zh, ja) enabled,
 * showcasing all CLI features.
 *
 * Usage: pnpm run generate:starter <target-dir>
 */

import { mkdir, writeFile, copyFile, readdir, rm, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBlogJson, buildReadme, copyScaffoldContent } from '../src/engine/starter.js'
import type { LanguageCodeType } from '../src/engine/config.js'

const HELP_TEXT = `
  Usage: pnpm run generate:starter <target-dir>

  Generate a trilingual (en/zh/ja) blog starter template into the target directory.
  Existing files (except .git) will be cleaned before generation.

  Arguments:
    target-dir    Path to the target directory (required)

  Options:
    --help, -h    Show this help message

  Examples:
    pnpm run generate:starter ../citepo-blog-starter
    pnpm run generate:starter /tmp/my-blog-template
`

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '..')
const scaffoldDir = resolve(projectRoot, 'src', 'scaffold')
const ALL_LANGUAGES: LanguageCodeType[] = ['en', 'zh', 'ja']

function parseArgs(argv: string[]): string {
  // tsx passes: [node, script, ...args]
  const args = argv.slice(2)

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  return resolve(args[0])
}

async function main() {
  const targetDir = parseArgs(process.argv)

  // Verify target directory exists
  try {
    await access(targetDir)
  } catch {
    console.error(`\n  Error: target directory does not exist: ${targetDir}\n`)
    process.exit(1)
  }

  console.log(`\n  Generating blog starter template...`)
  console.log(`  Target: ${targetDir}\n`)

  // 1. Clean targetDir (preserve .git)
  const entries = await readdir(targetDir)
  for (const entry of entries) {
    if (entry === '.git') continue
    await rm(join(targetDir, entry), { recursive: true, force: true })
  }

  // 2. Generate blog.json
  const blogConfig = buildBlogJson(
    { name: 'My Blog', description: '', defaultLanguage: 'en' },
    ALL_LANGUAGES,
  )
  await writeFile(
    join(targetDir, 'blog.json'),
    JSON.stringify(blogConfig, null, 2) + '\n',
    'utf-8',
  )
  console.log('  ✓ blog.json')

  // 3. Generate README.md
  const readmeContent = buildReadme('My Blog')
  await writeFile(join(targetDir, 'README.md'), readmeContent, 'utf-8')
  console.log('  ✓ README.md')

  // 4. Copy style.css
  await copyFile(join(scaffoldDir, 'style.css'), join(targetDir, 'style.css'))
  console.log('  ✓ style.css')

  // 5. Copy .gitignore
  await copyFile(join(scaffoldDir, 'gitignore.template'), join(targetDir, '.gitignore'))
  console.log('  ✓ .gitignore')

  // 6. Create content directories and copy scaffold posts
  for (const lang of ALL_LANGUAGES) {
    const contentDir = join(targetDir, 'content', lang)
    await mkdir(contentDir, { recursive: true })
    await copyScaffoldContent(scaffoldDir, contentDir, lang)
    console.log(`  ✓ content/${lang}/`)
  }

  // 7. Create asset/images/.gitkeep
  await mkdir(join(targetDir, 'asset', 'images'), { recursive: true })
  await writeFile(join(targetDir, 'asset', 'images', '.gitkeep'), '', 'utf-8')
  console.log('  ✓ asset/images/.gitkeep')

  console.log('\n  Done!\n')
}

main().catch((err) => {
  console.error('  Failed:', err)
  process.exit(1)
})
