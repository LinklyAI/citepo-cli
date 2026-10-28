import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { Command } from 'commander'
import { loadBlogConfig, normalizeBasePath } from '../../engine/config.js'
import { clearAstroCache, createFullAstroConfig, withPackageCwd } from '../../engine/astro.js'
import { CONTENT_IMAGES_DIR } from '../../engine/remark-relative-images.js'
import { action } from '../run.js'

export const devCommand = new Command('dev')
  .description('Start local development server')
  .option('-p, --port <port>', 'dev server port', '4321')
  .option('--base-path <path>', 'override basePath from blog.json')
  .action(
    action(async (_ctx, options: { port: string; basePath?: string }) => {
      const userDir = process.cwd()
      const port = parseInt(options.port, 10)

      const blogConfig = await loadBlogConfig(userDir)
      if (options.basePath) blogConfig.basePath = normalizeBasePath(options.basePath)

      // Ensure content images directory exists for relative image paths
      await mkdir(path.resolve(userDir, 'asset', CONTENT_IMAGES_DIR), { recursive: true })

      // Generate Astro config with dynamic integrations
      const astroConfig = await createFullAstroConfig(blogConfig, userDir, { port })

      // Clear cached .astro to avoid cross-project stale modules
      await clearAstroCache()

      // Disable Astro's update notification (citepo manages its own version updates)
      process.env.ASTRO_DISABLE_UPDATE_CHECK = 'true'

      // Start Astro dev server (switch cwd to package root so .astro/ SSR files can resolve deps)
      const { dev } = await import('astro')
      const restoreCwd = withPackageCwd()
      let devServer
      try {
        devServer = await dev(astroConfig)
      } finally {
        restoreCwd()
      }

      // Graceful shutdown
      const shutdown = async () => {
        console.log('\n  Stopping dev server...')
        await devServer.stop()
        process.exit(0)
      }
      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)

      const url = `http://localhost:${port}${blogConfig.basePath === '/' ? '' : blogConfig.basePath}`
      return { data: { url, port }, render: () => `\n  Blog dev server running at ${url}\n` }
    }),
  )
