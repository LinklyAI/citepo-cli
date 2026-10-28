import { Command } from 'commander'
import * as p from '@clack/prompts'
import { access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { getPackageRoot, getVersion } from '../utils.js'
import { SUPPORTED_THEMES, type LanguageCodeType, type ThemeNameType } from '../../engine/config.js'
import { createBlogProject } from '../../engine/starter.js'
import { LANGUAGE_CODES, LANGUAGE_LABELS, LANGUAGE_HINTS } from '../../engine/languages.js'
import { CliError } from '../error.js'
import { action } from '../run.js'
import { style } from '../output.js'

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

const DIRECTORY_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/**
 * Convert a string to kebab-case for directory names.
 * Returns null if the input cannot be converted (e.g., non-ASCII characters only).
 */
export function toKebabCase(str: string): string | null {
  const kebab = str
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric characters except hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  return kebab.length >= 1 ? kebab : null
}

export interface InitFlags {
  name?: string
  description?: string
  theme?: string
  lang?: string
  langs?: string
  yes?: boolean
}

export interface InitOptions {
  name: string
  directory: string
  description: string
  theme: ThemeNameType
  defaultLanguage: LanguageCodeType
  additionalLanguages: LanguageCodeType[]
}

export interface InitResult {
  name: string
  directory: string
  path: string
  theme: ThemeNameType
  defaultLanguage: LanguageCodeType
  languages: LanguageCodeType[]
  nextSteps: string[]
}

function parseTheme(value: string): ThemeNameType {
  if ((SUPPORTED_THEMES as readonly string[]).includes(value)) return value as ThemeNameType
  throw new CliError({
    code: 'invalid_option',
    message: `Unknown theme "${value}"`,
    expected: SUPPORTED_THEMES.join(' | '),
    hint: 'Example: citepo init my-blog --theme wabi',
  })
}

function parseLanguage(value: string): LanguageCodeType {
  const code = value.trim().toLowerCase()
  if ((LANGUAGE_CODES as readonly string[]).includes(code)) return code as LanguageCodeType
  throw new CliError({
    code: 'invalid_option',
    message: `Unknown language "${value}"`,
    expected: LANGUAGE_CODES.join(' | '),
    hint: 'Example: citepo init my-blog --lang en --langs zh,ja',
  })
}

function parseLanguages(value: string | undefined): LanguageCodeType[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseLanguage)
}

/**
 * Resolve options without prompting. Missing optional values get defaults; the blog
 * name falls back to the directory name and the directory to the kebab-cased name.
 */
export function resolveInitOptions(directory: string | undefined, flags: InitFlags): InitOptions {
  const name = flags.name?.trim() || directory
  if (!name) {
    throw new CliError({
      code: 'missing_option',
      message: 'A blog name or a directory is required',
      hint: 'Example: citepo init my-blog --name "My Blog" --yes',
    })
  }

  const dir = directory ?? toKebabCase(name)
  if (!dir) {
    throw new CliError({
      code: 'missing_option',
      message: `Cannot derive a directory name from "${name}"`,
      hint: `Pass the directory explicitly: citepo init my-blog --name "${name}" --yes`,
    })
  }
  validateDirectoryName(dir)

  return {
    name,
    directory: dir,
    description: flags.description ?? '',
    theme: flags.theme ? parseTheme(flags.theme) : 'clean',
    defaultLanguage: flags.lang ? parseLanguage(flags.lang) : 'en',
    additionalLanguages: parseLanguages(flags.langs),
  }
}

function validateDirectoryName(dir: string): void {
  // Paths are allowed (e.g. ../blogs/my-blog); only the last segment must be a clean name
  const last = dir.split(/[\\/]/).filter(Boolean).pop() ?? ''
  if (!DIRECTORY_PATTERN.test(last)) {
    throw new CliError({
      code: 'invalid_option',
      message: `Invalid directory name "${dir}"`,
      expected: 'lowercase letters, numbers and hyphens (e.g. my-blog)',
    })
  }
}

export const initCommand = new Command('init')
  .alias('new')
  .description('Create a new blog project')
  .argument('[directory]', 'project directory (kebab-case)')
  .option('--name <name>', 'blog name (defaults to the directory name)')
  .option('--description <text>', 'one-sentence description of the blog')
  .option('--theme <theme>', `theme: ${SUPPORTED_THEMES.join(' | ')}`)
  .option('--lang <code>', 'default language, e.g. en or zh')
  .option('--langs <codes>', 'extra languages, comma separated, e.g. zh,ja')
  .option('-y, --yes', 'never prompt; use defaults for anything not given')
  .addHelpText(
    'after',
    `
Examples:
  citepo init                                   # interactive
  citepo init my-blog --name "My Blog" --yes    # no prompts
  citepo init my-blog --lang en --langs zh,ja --theme wabi --yes`,
  )
  .action(
    action(async (ctx, directory: string | undefined, flags: InitFlags) => {
      const interactive =
        !flags.yes && !ctx.json && Boolean(process.stdin.isTTY && process.stdout.isTTY)

      let options: InitOptions
      if (interactive) {
        await renderBrand()
        p.intro('Create a new CitePo blog')
        options = await promptOptions(directory, flags)
      } else {
        options = resolveInitOptions(directory, flags)
      }

      const targetDir = resolve(process.cwd(), options.directory)
      if (await exists(targetDir)) {
        throw new CliError({
          code: 'directory_exists',
          message: `Directory "${options.directory}" already exists`,
          hint: 'Choose another directory name.',
        })
      }

      const spinner = interactive ? p.spinner() : undefined
      spinner?.start('Creating project files...')
      const languages = await createBlogProject(
        join(getPackageRoot(), 'src', 'scaffold'),
        targetDir,
        options,
      )
      spinner?.stop('Project created')
      if (interactive) p.outro('Your blog is ready!')

      const data: InitResult = {
        name: options.name,
        directory: options.directory,
        path: targetDir,
        theme: options.theme,
        defaultLanguage: options.defaultLanguage,
        languages,
        nextSteps: [`cd ${options.directory}`, 'citepo dev', 'citepo post new "My first post"'],
      }
      return { data, render: renderInit }
    }),
  )

function renderInit(data: InitResult): string {
  const rows: [string, string][] = [
    ['Name', data.name],
    ['Theme', data.theme],
    [
      'Languages',
      data.languages.join(', ') +
        (data.languages.length > 1 ? ` (default: ${data.defaultLanguage})` : ''),
    ],
    ['Directory', data.path],
  ]
  return [
    '',
    `  ${style.green('✓')} Created ${style.bold(data.name)}`,
    '',
    ...rows.map(([k, v]) => `  ${style.dim(k.padEnd(10))} ${v}`),
    '',
    '  Next steps:',
    ...data.nextSteps.map((step, i) => `  ${i + 1}. ${style.cyan(step)}`),
    '',
  ].join('\n')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Ask for everything not given as a flag. */
async function promptOptions(
  directory: string | undefined,
  flags: InitFlags,
): Promise<InitOptions> {
  const cancel = () => {
    p.cancel('Operation cancelled.')
    process.exit(130)
  }
  const askDirectoryName = () =>
    p.text({
      message: 'Enter project directory name (kebab-case)',
      placeholder: 'my-blog',
      defaultValue: 'my-blog',
      validate(value) {
        if (!value.trim()) return 'Directory name is required'
        if (!DIRECTORY_PATTERN.test(value))
          return 'Use lowercase letters, numbers, and hyphens only'
      },
    })

  const result = await p.group(
    {
      name: () =>
        flags.name
          ? Promise.resolve(flags.name)
          : p.text({
              message: 'What is the name of your blog?',
              placeholder: directory ?? 'My Blog',
              defaultValue: directory ?? 'My Blog',
              validate(value) {
                if (!value.trim()) return 'Blog name is required'
              },
            }),
      directory: async ({ results }) => {
        if (directory) return directory
        const suggestedDir = toKebabCase(results.name as string)
        if (!suggestedDir) return askDirectoryName()

        const choice = await p.select({
          message: 'Choose a project directory name (kebab-case recommended)',
          options: [
            { value: suggestedDir, label: suggestedDir, hint: 'recommended' },
            { value: '_custom', label: 'Enter custom name...' },
          ],
          initialValue: suggestedDir,
        })
        return choice === '_custom' ? askDirectoryName() : choice
      },
      description: () =>
        flags.description !== undefined
          ? Promise.resolve(flags.description)
          : p.text({
              message: 'Describe your blog in a sentence (optional)',
              placeholder: 'A blog about technology and life',
              defaultValue: '',
            }),
      theme: () =>
        flags.theme
          ? Promise.resolve(parseTheme(flags.theme))
          : p.select({
              message: 'Choose a theme',
              options: [...THEME_OPTIONS],
              initialValue: 'clean' as const,
            }),
      defaultLanguage: () =>
        flags.lang
          ? Promise.resolve(parseLanguage(flags.lang))
          : p.select({
              message: 'Choose the default language',
              options: [...LANGUAGE_OPTIONS],
              initialValue: 'en' as const,
            }),
      additionalLanguages: async ({ results }) => {
        if (flags.langs !== undefined) return parseLanguages(flags.langs)
        const enable = await p.confirm({
          message: 'Enable multi-language support?',
          initialValue: false,
        })
        if (p.isCancel(enable)) return cancel()
        if (!enable) return []

        const remaining = LANGUAGE_OPTIONS.filter((l) => l.value !== results.defaultLanguage)
        return p.multiselect({
          message: 'Select additional languages (Space to select, Enter to confirm)',
          options: remaining.map((l) => ({
            ...l,
            label: l.hint ? `${l.label} (${l.hint})` : l.label,
          })),
          required: false,
        })
      },
    },
    { onCancel: cancel },
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
