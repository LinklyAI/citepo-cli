import path from 'node:path'
import { mkdir, readdir, stat } from 'node:fs/promises'
import { Command } from 'commander'
import { loadBlogConfig, normalizeBasePath } from '../../engine/config.js'
import { clearAstroCache, createFullAstroConfig, withPackageCwd } from '../../engine/astro.js'
import { CONTENT_IMAGES_DIR } from '../../engine/remark-relative-images.js'
import { scanMdxSecurity, type SecurityIssue } from '../../engine/security.js'
import { runPostBuild } from '../../engine/post-build.js'
import { HOSTED_LIMITS, LIMIT_WARNING_RATIO } from '../../engine/limits.js'
import { CliError } from '../error.js'
import { action } from '../run.js'
import { formatSize, mark, style } from '../output.js'

interface BuildFlags {
  basePath?: string
  siteUrl?: string
  outDir: string
}

export interface BuildResult {
  name: string
  outDir: string
  durationMs: number
  pages: number
  files: number
  totalBytes: number
  artifacts: string[]
  /** Security warnings found in MDX content (errors abort the build). */
  securityWarnings: SecurityIssue[]
  notes: string[]
}

export const buildCommand = new Command('build')
  .description('Build static site for production')
  .option('--base-path <path>', 'override basePath from blog.json')
  .option('--site-url <url>', 'override siteUrl for canonical URLs, sitemap, RSS')
  .option('--out-dir <dir>', 'output directory', 'dist')
  .action(
    action(async (ctx, flags: BuildFlags) => {
      // Ensure production mode for React SSR compatibility
      process.env.NODE_ENV = 'production'

      const startTime = Date.now()
      const userDir = process.cwd()
      const log = (line: string) => {
        if (!ctx.json) console.log(line)
      }

      const blogConfig = await loadBlogConfig(userDir)
      if (flags.basePath) blogConfig.basePath = normalizeBasePath(flags.basePath)
      const siteUrl = flags.siteUrl

      const contentDir = path.resolve(userDir, 'content')
      const resolvedOutDir = path.resolve(userDir, flags.outDir)

      log(`\n  Building ${blogConfig.name}...\n`)

      const scanResult = await scanMdxSecurity(contentDir)
      const securityErrors = scanResult.issues.filter((issue) => issue.severity === 'error')
      for (const issue of scanResult.issues) {
        const prefix = issue.severity === 'error' ? mark.error() : mark.warn()
        log(`  ${prefix} ${issue.file}:${issue.line} — ${issue.message}`)
      }
      if (securityErrors.length > 0) {
        const first = securityErrors[0]!
        throw new CliError({
          code: 'security_errors',
          message: `Build aborted: ${securityErrors.length} security error(s) in MDX content`,
          file: first.file,
          line: first.line,
          hint: 'Run `citepo check` to list every problem with its location.',
        })
      }

      // Ensure content images directory exists for relative image paths
      await mkdir(path.resolve(userDir, 'asset', CONTENT_IMAGES_DIR), { recursive: true })

      const astroConfig = await createFullAstroConfig(blogConfig, userDir, {
        outDir: flags.outDir,
        siteUrl,
      })
      // Astro logs to stdout, which must carry only the JSON document in --json mode
      if (ctx.json) astroConfig.logLevel = 'error'

      // Clear cached .astro to avoid cross-project stale modules
      await clearAstroCache()

      // Disable Astro's update notification (citepo manages its own version updates)
      process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true'

      // Run Astro build (switch cwd to package root so .astro/ SSR files can resolve deps)
      const { build } = await import('astro')
      const restoreCwd = withPackageCwd()
      try {
        await build(astroConfig)
      } finally {
        restoreCwd()
      }

      const postBuildResult = await runPostBuild(blogConfig, resolvedOutDir, siteUrl)
      const outputStats = await scanOutputDir(resolvedOutDir)

      const artifacts: string[] = []
      if (outputStats.htmlCount > 0) artifacts.push(`${outputStats.htmlCount} pages`)
      if (outputStats.hasSitemap) artifacts.push('sitemap.xml')
      if (outputStats.hasRss) artifacts.push('rss.xml')
      artifacts.push(...postBuildResult.generatedFiles)

      const notes = [...postBuildResult.notes]
      if (outputStats.totalSize >= HOSTED_LIMITS.outputBytes * LIMIT_WARNING_RATIO) {
        notes.push(
          `Output is ${formatSize(outputStats.totalSize)}; hosted builds allow up to ${formatSize(HOSTED_LIMITS.outputBytes)}. ` +
            'Run `citepo check` to find the largest images.',
        )
      }

      const data: BuildResult = {
        name: blogConfig.name,
        outDir: resolvedOutDir,
        durationMs: Date.now() - startTime,
        pages: outputStats.htmlCount,
        files: outputStats.fileCount,
        totalBytes: outputStats.totalSize,
        artifacts,
        securityWarnings: scanResult.issues.filter((issue) => issue.severity !== 'error'),
        notes,
      }
      return { data, render: renderBuild }
    }),
  )

function renderBuild(data: BuildResult): string {
  return [
    '',
    `  ${mark.ok()} Build complete in ${(data.durationMs / 1000).toFixed(1)}s`,
    `  ${style.dim('Output')}     ${data.outDir}`,
    `  ${style.dim('Artifacts')}  ${data.artifacts.join(', ')}`,
    `  ${style.dim('Files')}      ${data.files} (${formatSize(data.totalBytes)})`,
    ...data.notes.map((note) => `  ${mark.warn()} ${note}`),
    '',
  ].join('\n')
}

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
