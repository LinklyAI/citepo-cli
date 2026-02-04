import { Command } from 'commander'
import { loadBlogConfig, normalizeBasePath } from '../../engine/config.js'
import { clearAstroCache, createFullAstroConfig, withPackageCwd } from '../../engine/astro.js'
import { handleCommandError } from '../error.js'

export const devCommand = new Command('dev')
  .description('Start local development server')
  .option('-p, --port <port>', 'dev server port', '4321')
  .option('--base-path <path>', 'override basePath from blog.json')
  .action(async (options: { port: string; basePath?: string }) => {
    const userDir = process.cwd()
    const port = parseInt(options.port, 10)

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

    console.log(`\n  Blog dev server running at http://localhost:${port}\n`)

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n  Stopping dev server...')
      await devServer.stop()
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  })
