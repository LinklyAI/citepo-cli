import { Command } from 'commander'
import * as p from '@clack/prompts'
import { mkdir, writeFile, copyFile, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { getPackageRoot, getVersion } from '../utils.js'
import type { LanguageCodeType, ThemeNameType } from '../../engine/config.js'
import { buildBlogJson, buildReadme, copyScaffoldContent } from '../../engine/starter.js'

const BRAND_BANNER = `
  \x1b[32m██████╗ ██╗ ████████╗ ███████╗ ██████╗   ██████╗
 ██╔════╝ ██║ ╚══██╔══╝ ██╔════╝ ██╔══██╗ ██╔═══██╗
 ██║      ██║    ██║    █████╗   ██████╔╝ ██║   ██║
 ██║      ██║    ██║    ██╔══╝   ██╔═══╝  ██║   ██║
 ╚██████╗ ██║    ██║    ███████╗ ██║      ╚██████╔╝
  ╚═════╝ ╚═╝    ╚═╝    ╚══════╝ ╚═╝       ╚═════╝\x1b[0m
`

/** Render brand logo */
async function renderBrand(): Promise<void> {
  const version = await getVersion()
  console.log(BRAND_BANNER)
  console.log(`  v${version} — A lightweight blog publishing platform\n`)
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', hint: 'Default' },
  { value: 'zh', label: '中文', hint: 'Chinese' },
  { value: 'ja', label: '日本語', hint: 'Japanese' },
] as const

const THEME_OPTIONS = [
  { value: 'clean', label: 'Clean', hint: 'Minimal black & white' },
  { value: 'wabi', label: 'Wabi', hint: 'Warm reading theme' },
] as const

interface NewCommandOptions {
  name: string
  description: string
  theme: ThemeNameType
  defaultLanguage: LanguageCodeType
  additionalLanguages: LanguageCodeType[]
}

export const newCommand = new Command('new')
  .description('Create a new blog project')
  .argument('[directory]', 'project directory name')
  .action(async (directory?: string) => {
    await renderBrand()
    p.intro('Create a new CitePo blog')

    const options = await collectUserInput(directory)
    if (!options) return

    const targetDir = resolve(process.cwd(), directory ?? options.name)
    await generateProject(targetDir, options)

    p.outro('Your blog is ready!')

    console.log('')
    console.log('  Next steps:')
    console.log(`  1. cd ${directory ?? options.name}`)
    console.log('  2. npx citepo dev')
    console.log('  3. Open http://localhost:4321')
    console.log('')
  })

/** Interactively collect user input */
async function collectUserInput(directory?: string): Promise<NewCommandOptions | undefined> {
  const result = await p.group(
    {
      name: () =>
        p.text({
          message: 'What is the name of your blog?',
          placeholder: directory ?? 'my-blog',
          defaultValue: directory ?? 'my-blog',
          validate(value) {
            if (!value.trim()) return 'Blog name is required'
          },
        }),
      description: () =>
        p.text({
          message: 'Describe your blog in a sentence (optional)',
          placeholder: 'A personal blog about technology and life',
          defaultValue: '',
        }),
      theme: () =>
        p.select({
          message: 'Choose a theme',
          options: [...THEME_OPTIONS],
          initialValue: 'clean' as const,
        }),
      defaultLanguage: () =>
        p.select({
          message: 'Choose the default language',
          options: [...LANGUAGE_OPTIONS],
          initialValue: 'en' as const,
        }),
      enableMultiLang: () =>
        p.confirm({
          message: 'Enable multi-language support?',
          initialValue: false,
        }),
      additionalLanguages: ({ results }) => {
        // Skip if multi-lang is not enabled
        if (!results.enableMultiLang) return Promise.resolve([])

        const remaining = LANGUAGE_OPTIONS.filter((l) => l.value !== results.defaultLanguage)
        if (remaining.length === 0) return Promise.resolve([])

        return p.multiselect({
          message: 'Select additional languages (Space to select, Enter to confirm)',
          options: remaining.map((l) => ({ ...l, label: `${l.label} (${l.hint})` })),
          required: false,
        })
      },
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.')
        process.exit(0)
      },
    },
  )

  return {
    name: result.name as string,
    description: (result.description as string) ?? '',
    theme: result.theme as ThemeNameType,
    defaultLanguage: result.defaultLanguage as LanguageCodeType,
    additionalLanguages: (result.additionalLanguages ?? []) as LanguageCodeType[],
  }
}

/** Generate project files */
async function generateProject(targetDir: string, options: NewCommandOptions): Promise<void> {
  // Check if target directory already exists
  try {
    await access(targetDir)
    p.log.error(`Directory "${targetDir}" already exists.`)
    process.exit(1)
  } catch {
    // Directory does not exist, proceed
  }

  const s = p.spinner()
  s.start('Creating project files...')

  const scaffoldDir = join(getPackageRoot(), 'src', 'scaffold')
  const allLanguages = [options.defaultLanguage, ...options.additionalLanguages]
  const isMultiLang = allLanguages.length > 1

  // Create directory structure
  await mkdir(targetDir, { recursive: true })
  await mkdir(join(targetDir, 'asset', 'images'), { recursive: true })

  if (isMultiLang) {
    for (const lang of allLanguages) {
      await mkdir(join(targetDir, 'content', lang), { recursive: true })
    }
  } else {
    await mkdir(join(targetDir, 'content'), { recursive: true })
  }

  // Generate blog.json
  const blogConfig = buildBlogJson(
    { name: options.name, description: options.description, defaultLanguage: options.defaultLanguage, theme: options.theme },
    allLanguages,
  )
  await writeFile(join(targetDir, 'blog.json'), JSON.stringify(blogConfig, null, 2) + '\n', 'utf-8')

  // Copy style.css
  await copyFile(join(scaffoldDir, 'style.css'), join(targetDir, 'style.css'))

  // Copy .gitignore
  await copyFile(join(scaffoldDir, 'gitignore.template'), join(targetDir, '.gitignore'))

  // Generate README.md from template
  const readmeContent = buildReadme(options.name)
  await writeFile(join(targetDir, 'README.md'), readmeContent, 'utf-8')

  // Copy scaffold example posts
  if (isMultiLang) {
    for (const lang of allLanguages) {
      const contentDir = join(targetDir, 'content', lang)
      await copyScaffoldContent(scaffoldDir, contentDir, lang)
    }
  } else {
    await copyScaffoldContent(scaffoldDir, join(targetDir, 'content'), options.defaultLanguage)
  }

  // Create asset/images/.gitkeep
  await writeFile(join(targetDir, 'asset', 'images', '.gitkeep'), '', 'utf-8')

  s.stop('Project created successfully!')

  // Print summary
  p.log.success(`Blog name: ${options.name}`)
  p.log.info(`Languages: ${allLanguages.join(', ')}`)
  if (isMultiLang) {
    p.log.info(`Multi-language: enabled (default: ${options.defaultLanguage})`)
  }
  p.log.info(`Theme: ${options.theme}`)
  p.log.info(`Directory: ${targetDir}`)
}

