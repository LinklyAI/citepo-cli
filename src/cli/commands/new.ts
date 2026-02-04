import { Command } from 'commander'
import * as p from '@clack/prompts'
import { mkdir, writeFile, copyFile, access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { getPackageRoot, getVersion } from '../utils.js'
import type { LanguageCodeType, ThemeNameType } from '../../engine/config.js'
import { buildBlogJson, buildReadme, copyScaffoldContent } from '../../engine/starter.js'
import { LANGUAGE_CODES, LANGUAGE_LABELS, LANGUAGE_HINTS } from '../../engine/languages.js'

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
  console.log(`  v${version} — A lightweight CLI for creating, previewing, and building blogs.\n`)
}

const LANGUAGE_OPTIONS = LANGUAGE_CODES.map((code) => ({
  value: code,
  label: LANGUAGE_LABELS[code],
  hint: LANGUAGE_HINTS[code],
}))

const THEME_OPTIONS = [
  { value: 'clean', label: 'Clean', hint: 'Minimal black & white' },
  { value: 'wabi', label: 'Wabi', hint: 'Warm reading theme' },
] as const

/**
 * Convert a string to kebab-case for directory names.
 * Returns null if the input cannot be converted (e.g., non-ASCII characters only).
 */
function toKebabCase(str: string): string | null {
  // Remove leading/trailing whitespace
  const trimmed = str.trim()
  if (!trimmed) return null

  // Convert to lowercase, replace spaces and underscores with hyphens
  const kebab = trimmed
    .toLowerCase()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric characters except hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

  // Return null if result is empty or too short
  return kebab.length >= 1 ? kebab : null
}

interface NewCommandOptions {
  name: string
  directory: string
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

    const targetDir = resolve(process.cwd(), options.directory)
    await generateProject(targetDir, options)

    p.outro('Your blog is ready!')

    console.log('')
    console.log('  Next steps:')
    console.log(`  1. cd ${options.directory}`)
    console.log('  2. npx citepo dev (or npx ctp dev)')
    console.log('  3. Open http://localhost:4321 to preview your blog')
    console.log('')
  })

/** Interactively collect user input */
async function collectUserInput(directory?: string): Promise<NewCommandOptions | undefined> {
  const result = await p.group(
    {
      name: () =>
        p.text({
          message: 'What is the name of your blog?',
          placeholder: directory ?? 'My Blog',
          defaultValue: directory ?? 'My Blog',
          validate(value) {
            if (!value.trim()) return 'Blog name is required'
          },
        }),
      directory: async ({ results }) => {
        // If directory was provided via CLI argument, use it directly
        if (directory) return directory

        const blogName = results.name as string
        const suggestedDir = toKebabCase(blogName)

        // If we can parse a valid kebab-case name, offer it as an option
        if (suggestedDir) {
          const choice = await p.select({
            message: 'Choose a project directory name (kebab-case recommended)',
            options: [
              { value: suggestedDir, label: suggestedDir, hint: 'recommended' },
              { value: '_custom', label: 'Enter custom name...' },
            ],
            initialValue: suggestedDir,
          })

          if (choice === '_custom') {
            return p.text({
              message: 'Enter project directory name (kebab-case)',
              placeholder: 'my-blog',
              defaultValue: 'my-blog',
              validate(value) {
                if (!value.trim()) return 'Directory name is required'
                if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only'
              },
            })
          }

          return choice
        }

        // Cannot parse a valid name, ask user to input manually
        return p.text({
          message: 'Enter project directory name (kebab-case)',
          placeholder: 'my-blog',
          defaultValue: 'my-blog',
          validate(value) {
            if (!value.trim()) return 'Directory name is required'
            if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only'
          },
        })
      },
      description: () =>
        p.text({
          message: 'Describe your blog in a sentence (optional)',
          placeholder: 'A blog about technology and life',
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
      additionalLanguages: async ({ results }) => {
        // Skip if multi-lang is not enabled
        if (!results.enableMultiLang) return []

        const remaining = LANGUAGE_OPTIONS.filter((l) => l.value !== results.defaultLanguage)
        if (remaining.length === 0) return []

        const selected = await p.multiselect({
          message: 'Select additional languages (Space to select, Enter to confirm)',
          options: remaining.map((l) => ({
            ...l,
            label: l.hint ? `${l.label} (${l.hint})` : l.label,
          })),
          required: false,
        })

        // Show tip as a confirmation step
        await p.select({
          message: 'Need other languages? Create folders manually in content/ directory.',
          options: [{ value: 'ok', label: 'Got it, continue' }],
          initialValue: 'ok',
        })

        return selected
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
    directory: result.directory as string,
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

  // Copy default favicon files
  await copyFile(join(scaffoldDir, 'asset', 'favicon.ico'), join(targetDir, 'asset', 'favicon.ico'))
  await copyFile(join(scaffoldDir, 'asset', 'favicon.svg'), join(targetDir, 'asset', 'favicon.svg'))

  s.stop('Project created successfully!')

  // Print summary using p.note for a cleaner look
  const summaryLines = [
    `Name:      ${options.name}`,
    `Project:   ${options.directory}`,
    `Theme:     ${options.theme}`,
    `Languages: ${allLanguages.join(', ')}${isMultiLang ? ` (default: ${options.defaultLanguage})` : ''}`,
    `Directory: ${targetDir}`,
  ]
  p.note(summaryLines.join('\n'), 'Summary')
}

