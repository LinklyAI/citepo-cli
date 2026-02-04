import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import type { AstroInlineConfig } from 'astro'
import type { Plugin } from 'vite'
import type { BlogConfig } from './config.js'
import { getPackageRoot } from '../cli/utils.js'
import { createMdxClientDirectivePlugin } from './mdx-client-directive.js'
import { createMdxCodeMetaPlugin } from './mdx-code-meta.js'
import { createMdxCodeGroupLabelsPlugin } from './mdx-code-group-labels.js'
import { createRehypeCodeMetaPlugin } from './rehype-code-meta.js'
import { createShikiMetaTransformer } from './shiki-code-meta.js'
import { createRemarkRelativeImagesPlugin } from './remark-relative-images.js'

const VIRTUAL_MODULE_ID = 'virtual:blog-config'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID
const MDX_CLIENT_COMPONENTS = ['AccordionGroup', 'CodeGroup']

/**
 * Vite virtual module plugin: injects BlogConfig as `virtual:blog-config`.
 * Astro pages can access it via `import config from 'virtual:blog-config'`.
 */
function blogConfigPlugin(blogConfig: BlogConfig, siteUrl?: string): Plugin {
  return {
    name: 'citepo:blog-config',
    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID
    },
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const data = siteUrl ? { ...blogConfig, siteUrl } : blogConfig
        return `export default ${JSON.stringify(data)}`
      }
    },
  }
}

/**
 * Vite plugin: resolves `@user-style` to the user's style.css path.
 * Returns empty CSS if the file doesn't exist to avoid build errors.
 */
function userStylePlugin(userDir: string): Plugin {
  const USER_STYLE_ID = '@user-style'
  const RESOLVED_USER_STYLE_ID = '\0@user-style'
  const stylePath = path.resolve(userDir, 'style.css')

  return {
    name: 'citepo:user-style',
    resolveId(id: string) {
      if (id === USER_STYLE_ID) {
        if (fs.existsSync(stylePath)) return stylePath
        return RESOLVED_USER_STYLE_ID
      }
    },
    load(id: string) {
      if (id === RESOLVED_USER_STYLE_ID) {
        return '/* no user style.css found */'
      }
    },
  }
}


/**
 * Temporarily switch process.cwd() to citepo's package root so that
 * Astro's SSR intermediate files (.astro/) are written inside the package tree,
 * where Node.js ESM resolution can find dependencies like react.
 *
 * Returns a restore function that resets cwd to the original value.
 */
export function withPackageCwd(): () => void {
  const originalCwd = process.cwd()
  const packageRoot = getPackageRoot()
  process.chdir(packageRoot)
  return () => process.chdir(originalCwd)
}

/**
 * Clear Astro cache under the CLI package to avoid cross-project stale modules.
 * Astro writes .astro/ into the package root when running inside the CLI.
 */
export async function clearAstroCache(): Promise<void> {
  const packageRoot = getPackageRoot()
  const cacheDir = path.resolve(packageRoot, 'src/astro-project/.astro')
  try {
    await fsPromises.rm(cacheDir, { recursive: true, force: true })
  } catch {
    // Ignore cache cleanup errors
  }
}

export interface CreateAstroConfigOptions {
  port?: number
  outDir?: string
  siteUrl?: string
}

/**
 * Generate Astro inline config for `citepo dev` and `citepo build`.
 *
 * @param blogConfig - Parsed blog.json configuration
 * @param userDir - User's blog project root (contains blog.json, content/, asset/)
 * @param options - Optional settings (port, outDir, etc.)
 */
export function createAstroConfig(
  blogConfig: BlogConfig,
  userDir: string,
  options?: CreateAstroConfigOptions,
): AstroInlineConfig {
  const packageRoot = getPackageRoot()
  const astroProjectRoot = path.resolve(packageRoot, 'src/astro-project')
  const contentDir = path.resolve(userDir, 'content')
  const publicDir = path.resolve(userDir, 'asset')
  const outDir = options?.outDir
    ? path.resolve(userDir, options.outDir)
    : path.resolve(userDir, 'dist')

  // Pass content directory path to content.config.ts via environment variable
  process.env.CITEPO_CONTENT_DIR = contentDir
  // Pass blog.json config (fallback channel; virtual module is primary)
  process.env.CITEPO_BLOG_CONFIG = JSON.stringify({
    ...blogConfig,
    ...(options?.siteUrl ? { siteUrl: options.siteUrl } : {}),
  })

  // Validate theme directory exists
  const themeDir = path.resolve(packageRoot, `src/theme/${blogConfig.theme}`)
  if (!fs.existsSync(themeDir)) {
    throw new Error(
      `Theme "${blogConfig.theme}" not found at ${themeDir}. Supported themes: clean, wabi`,
    )
  }

  return {
    root: astroProjectRoot,
    publicDir,
    outDir,
    base: blogConfig.basePath,
    site: options?.siteUrl,
    configFile: false,
    prefetch: {
      prefetchAll: true,
    },
    devToolbar: {
      enabled: false,
    },
    server: {
      port: options?.port ?? 4321,
    },
    integrations: [
      // Dynamically imported to avoid tsup bundling
    ],
    vite: {
      plugins: [
        blogConfigPlugin(blogConfig, options?.siteUrl),
        userStylePlugin(userDir),
      ],
      resolve: {
        alias: {
          '@theme': path.resolve(packageRoot, `src/theme/${blogConfig.theme}`),
          '@ui': path.resolve(packageRoot, 'src/ui'),
          '@mdx': path.resolve(packageRoot, 'src/mdx-components'),
          // User-friendly image path aliases for MDX content
          // Allows: ![alt](images/xxx.webp) instead of ![alt](/images/xxx.webp)
          'images': path.resolve(userDir, 'asset/images'),
          // Support relative paths from content directory to asset/images/
          '../asset/images': path.resolve(userDir, 'asset/images'),
          '../../asset/images': path.resolve(userDir, 'asset/images'),
          '../../../asset/images': path.resolve(userDir, 'asset/images'),
        },
      },
      server: {
        fs: {
          // Allow accessing files from user project, its parent directory,
          // and disable strict mode to allow Astro dev-toolbar from global installs
          allow: [packageRoot, userDir, path.dirname(userDir)],
          strict: false,
        },
      },
    },
  }
}

/**
 * Dynamically load Astro integrations to avoid bundling with tsup.
 * Called at runtime to ensure correct resolution from node_modules.
 */
export async function loadIntegrations() {
  const [{ default: mdx }, { default: react }, { default: sitemap }, { default: tailwindVite }] =
    await Promise.all([
      import('@astrojs/mdx'),
      import('@astrojs/react'),
      import('@astrojs/sitemap'),
      import('@tailwindcss/vite'),
    ])

  return { mdx, react, sitemap, tailwindVite }
}

/**
 * Create full Astro config with dynamically loaded integrations and Tailwind plugin.
 */
export async function createFullAstroConfig(
  blogConfig: BlogConfig,
  userDir: string,
  options?: CreateAstroConfigOptions,
): Promise<AstroInlineConfig> {
  const config = createAstroConfig(blogConfig, userDir, options)
  const { mdx, react, sitemap, tailwindVite } = await loadIntegrations()

  // Create remark plugins
  const contentDir = path.resolve(userDir, 'content')
  const assetDir = path.resolve(userDir, 'asset')
  const remarkRelativeImagesPlugin = createRemarkRelativeImagesPlugin({ contentDir, assetDir })
  const mdxClientDirectivePlugin = createMdxClientDirectivePlugin(MDX_CLIENT_COMPONENTS)
  const mdxCodeMetaPlugin = createMdxCodeMetaPlugin()
  const mdxCodeGroupLabelsPlugin = createMdxCodeGroupLabelsPlugin()
  const rehypeCodeMetaPlugin = createRehypeCodeMetaPlugin()
  const shikiMetaTransformer = createShikiMetaTransformer()

  config.integrations = [
    mdx({
      // remarkRelativeImagesPlugin must be first to process images before other plugins
      remarkPlugins: [
        remarkRelativeImagesPlugin,
        mdxClientDirectivePlugin,
        mdxCodeMetaPlugin,
        mdxCodeGroupLabelsPlugin,
      ],
      rehypePlugins: [rehypeCodeMetaPlugin],
      shikiConfig: {
        transformers: [shikiMetaTransformer],
      },
    }),
    react(),
    ...(blogConfig.sitemap ? [sitemap()] : []),
  ]

  // Prepend Tailwind CSS v4 Vite plugin to the plugins list
  const existingPlugins = (config.vite?.plugins ?? []) as Plugin[]
  config.vite = {
    ...config.vite,
    plugins: [tailwindVite(), ...existingPlugins],
  }

  return config
}
