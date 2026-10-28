import { copyFile, access, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LanguageCodeType, ThemeNameType } from './config.js'

export interface StarterOptions {
  name: string
  description: string
  defaultLanguage: LanguageCodeType
  theme: ThemeNameType
}

/** Build blog.json object for project scaffolding */
export function buildBlogJson(
  options: StarterOptions,
  allLanguages: LanguageCodeType[],
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    $schema: 'https://cdn.citepo.com/assets/schema.json',
    name: options.name,
    description: options.description,
    theme: options.theme,
    logo: 'https://cdn.citepo.com/assets/citepo-icon-128.webp',
    defaultLanguage: options.defaultLanguage,
  }

  if (allLanguages.length > 1) {
    config.languages = allLanguages
  }

  config.hero = { image: 'https://cdn.citepo.com/assets/clean-banner.webp' }
  config.contextual = { options: ['copy', 'view', 'chatgpt', 'claude'] }
  config.basePath = '/'
  config.rss = true
  config.sitemap = true
  config.llmsText = true
  config.skillMd = true
  config.postsPerPage = 10

  return config
}

/** Generate README.md content */
export function buildReadme(blogName: string): string {
  return `# ${blogName}

A blog powered by [CitePo](https://citepo.com).

## Project Structure

\`\`\`
├── blog.json        # Blog configuration
├── style.css        # Custom styles (overrides theme)
├── content/         # Blog posts (MDX)
├── asset/           # Static assets
│   └── images/      # Image files
└── .gitignore
\`\`\`

## Quick Start

\`\`\`bash
# Start development server
npx citepo dev

# Build for production
npx citepo build

# Preview build output
npx serve dist
\`\`\`

## Writing Posts

Create \`.mdx\` files in the \`content/\` directory with frontmatter:

\`\`\`mdx
---
title: My First Post
description: A short description
date: 2025-01-01
tags: [blog, intro]
---

Your content here...
\`\`\`

## Configuration

Edit \`blog.json\` to customize your blog. See [CitePo Documentation](https://citepo.com/docs) for details.

## Custom Styles

Add custom CSS to \`style.css\`. These styles load after the theme and have higher priority.

## Learn More

- [CitePo Documentation](https://citepo.com/docs)
- [CitePo GitHub](https://github.com/LinklyAI/citepo-cli)
`
}

export interface CreateProjectOptions extends StarterOptions {
  /** Extra languages besides the default one; empty for a single-language blog. */
  additionalLanguages: LanguageCodeType[]
}

/**
 * Create a new blog project in `targetDir`, which must not exist yet.
 * Returns the full language list of the new blog.
 */
export async function createBlogProject(
  scaffoldDir: string,
  targetDir: string,
  options: CreateProjectOptions,
): Promise<LanguageCodeType[]> {
  const allLanguages = [
    options.defaultLanguage,
    ...options.additionalLanguages.filter((l) => l !== options.defaultLanguage),
  ]
  const isMultiLang = allLanguages.length > 1

  await mkdir(join(targetDir, 'asset', 'images'), { recursive: true })
  if (isMultiLang) {
    for (const lang of allLanguages)
      await mkdir(join(targetDir, 'content', lang), { recursive: true })
  } else {
    await mkdir(join(targetDir, 'content'), { recursive: true })
  }

  const blogConfig = buildBlogJson(options, allLanguages)
  await writeFile(join(targetDir, 'blog.json'), JSON.stringify(blogConfig, null, 2) + '\n', 'utf-8')
  await copyFile(join(scaffoldDir, 'style.css'), join(targetDir, 'style.css'))
  await copyFile(join(scaffoldDir, 'gitignore.template'), join(targetDir, '.gitignore'))
  await writeFile(join(targetDir, 'README.md'), buildReadme(options.name), 'utf-8')

  if (isMultiLang) {
    for (const lang of allLanguages) {
      await copyScaffoldContent(scaffoldDir, join(targetDir, 'content', lang), lang)
    }
  } else {
    await copyScaffoldContent(scaffoldDir, join(targetDir, 'content'), options.defaultLanguage)
  }

  await writeFile(join(targetDir, 'asset', 'images', '.gitkeep'), '', 'utf-8')
  await copyFile(join(scaffoldDir, 'asset', 'favicon.ico'), join(targetDir, 'asset', 'favicon.ico'))
  await copyFile(join(scaffoldDir, 'asset', 'favicon.svg'), join(targetDir, 'asset', 'favicon.svg'))

  return allLanguages
}

/** Copy scaffold content to target directory with language fallback */
export async function copyScaffoldContent(
  scaffoldDir: string,
  contentDir: string,
  lang: LanguageCodeType,
): Promise<void> {
  // Select example posts matching the language
  const langSuffix = lang !== 'en' ? `.${lang}` : ''
  const helloFile = `hello-world${langSuffix}.mdx`
  const whyFile = `why-choose-citepo-to-build-blog${langSuffix}.mdx`

  // Check if language-specific file exists, fallback to English
  const helloSrc = (await fileExists(join(scaffoldDir, 'content', helloFile)))
    ? join(scaffoldDir, 'content', helloFile)
    : join(scaffoldDir, 'content', 'hello-world.mdx')

  const whySrc = (await fileExists(join(scaffoldDir, 'content', whyFile)))
    ? join(scaffoldDir, 'content', whyFile)
    : join(scaffoldDir, 'content', 'why-choose-citepo-to-build-blog.mdx')

  await copyFile(helloSrc, join(contentDir, 'hello-world.mdx'))
  await copyFile(whySrc, join(contentDir, 'why-choose-citepo-to-build-blog.mdx'))
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
