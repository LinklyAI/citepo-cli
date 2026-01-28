import { copyFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { LanguageCodeType } from './config.js'

export interface StarterOptions {
  name: string
  description: string
  defaultLanguage: LanguageCodeType
}

/** Build blog.json object for project scaffolding */
export function buildBlogJson(
  options: StarterOptions,
  allLanguages: LanguageCodeType[],
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    $schema: 'https://unpkg.com/citepo/schema.json',
    name: options.name,
    description: options.description,
    theme: 'clean',
    defaultLanguage: options.defaultLanguage,
  }

  if (allLanguages.length > 1) {
    config.languages = allLanguages
  }

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
