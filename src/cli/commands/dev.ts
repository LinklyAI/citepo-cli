import { Command } from 'commander'
import { loadBlogConfig } from '../../engine/config.js'
import { createFullAstroConfig } from '../../engine/astro.js'
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
      blogConfig.basePath = options.basePath
    }

    // Generate Astro config with dynamic integrations
    const astroConfig = await createFullAstroConfig(blogConfig, userDir, { port })

    // Start Astro dev server
    const { dev } = await import('astro')
    const devServer = await dev(astroConfig)

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
