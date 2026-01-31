import path from 'node:path'
import { readdir, stat } from 'node:fs/promises'
import { Command } from 'commander'
import { loadBlogConfig, normalizeBasePath } from '../../engine/config.js'
import { clearAstroCache, createFullAstroConfig, withPackageCwd } from '../../engine/astro.js'
import { scanMdxSecurity } from '../../engine/security.js'
import { runPostBuild } from '../../engine/post-build.js'
import { handleCommandError } from '../error.js'

export const buildCommand = new Command('build')
  .description('Build static site for production')
  .option('--base-path <path>', 'override basePath from blog.json')
  .option('--site-url <url>', 'override siteUrl for canonical URLs, sitemap, RSS')
  .option('--out-dir <dir>', 'output directory', 'dist')
  .action(async (options: { basePath?: string; siteUrl?: string; outDir: string }) => {
    // Ensure production mode for React SSR compatibility
    process.env.NODE_ENV = 'production'

    const startTime = Date.now()
    const userDir = process.cwd()

    // Load and validate blog.json
    let blogConfig
    try {
      blogConfig = await loadBlogConfig(userDir)
    } catch (err) {
      handleCommandError(err, `load blog.json in ${userDir}`)
    }

    // Override basePath if specified via CLI
    if (options.basePath) {
      blogConfig.basePath = normalizeBasePath(options.basePath)
    }
    const siteUrl = options.siteUrl

    const contentDir = path.resolve(userDir, 'content')
    const resolvedOutDir = path.resolve(userDir, options.outDir)

    console.log(`\n  Building ${blogConfig.name}...\n`)

    // MDX security scan
    const scanResult = await scanMdxSecurity(contentDir)

    if (scanResult.issues.length > 0) {
      console.log('  Security scan results:')
      for (const issue of scanResult.issues) {
        const prefix = issue.severity === 'error' ? '  ✗' : '  ⚠'
        console.log(`  ${prefix} ${issue.file}:${issue.line} — ${issue.message}`)
      }
      console.log('')
    }

    if (scanResult.hasErrors) {
      console.error('  Build aborted: security errors found in MDX content.\n')
      process.exit(1)
    }

    // Generate Astro config
    const astroConfig = await createFullAstroConfig(blogConfig, userDir, {
      outDir: options.outDir,
      siteUrl,
    })

    // Clear cached .astro to avoid cross-project stale modules
    await clearAstroCache()

    // Run Astro build (switch cwd to package root so .astro/ SSR files can resolve deps)
    const { build } = await import('astro')
    const restoreCwd = withPackageCwd()
    try {
      await build(astroConfig)
    } finally {
      restoreCwd()
    }

    // Post-build: generate additional artifacts
    const postBuildResult = await runPostBuild(blogConfig, contentDir, resolvedOutDir, siteUrl)

    // Collect output stats and print build summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    const outputStats = await scanOutputDir(resolvedOutDir)

    console.log(`\n  Build complete in ${duration}s`)
    console.log(`  Output: ${resolvedOutDir}\n`)

    // Artifacts table
    const artifacts: string[] = []
    if (outputStats.htmlCount > 0) artifacts.push(`${outputStats.htmlCount} pages`)
    if (outputStats.hasSitemap) artifacts.push('sitemap.xml')
    if (outputStats.hasRss) artifacts.push('rss.xml')
    for (const f of postBuildResult.generatedFiles) artifacts.push(f)

    console.log(`  Artifacts: ${artifacts.join(', ')}`)
    console.log(`  Files:     ${outputStats.fileCount} (${formatSize(outputStats.totalSize)})`)
    console.log('')
  })

interface OutputStats {
  fileCount: number
  totalSize: number
  htmlCount: number
  hasSitemap: boolean
  hasRss: boolean
}

/** Recursively scan output directory for file stats */
async function scanOutputDir(dir: string): Promise<OutputStats> {
  const stats: OutputStats = {
    fileCount: 0,
    totalSize: 0,
    htmlCount: 0,
    hasSitemap: false,
    hasRss: false,
  }

  const entries = await readdir(dir, { recursive: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, String(entry))
    const fileStat = await stat(fullPath)

    if (!fileStat.isFile()) continue

    stats.fileCount++
    stats.totalSize += fileStat.size

    const name = String(entry)
    if (name.endsWith('.html')) stats.htmlCount++
    if (name === 'sitemap-index.xml' || name === 'sitemap.xml') stats.hasSitemap = true
    if (name === 'rss.xml') stats.hasRss = true
  }

  return stats
}

/** Format byte size to human-readable string */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
