import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BlogConfig } from './config.js'
import { generateRobotsTxt } from './generators/robots-txt.js'

export interface PostBuildResult {
  generatedFiles: string[]
  /** Notes for the build log (e.g. what to configure on the host). */
  notes: string[]
}

/**
 * Run post-build processing to generate additional static artifacts.
 *
 * llms.txt, llms-full.txt and skill.md are Astro routes (src/astro-project/src/pages),
 * so they share the content collection ids with the HTML pages; only robots.txt is
 * written here.
 */
export async function runPostBuild(
  blogConfig: BlogConfig,
  outDir: string,
  siteUrl?: string,
): Promise<PostBuildResult> {
  // robots.txt only takes effect at the host root; under a base path it would be ignored.
  if (blogConfig.basePath !== '/') {
    const notes = siteUrl
      ? [
          `robots.txt skipped: the blog lives under ${blogConfig.basePath}. Add this line to the robots.txt at your domain root:`,
          `  Sitemap: ${siteUrl.replace(/\/+$/, '')}${blogConfig.basePath}/sitemap-index.xml`,
        ]
      : [`robots.txt skipped: the blog lives under ${blogConfig.basePath}; robots.txt only works at the domain root.`]
    return { generatedFiles: [], notes }
  }

  await writeFile(path.join(outDir, 'robots.txt'), generateRobotsTxt(siteUrl, blogConfig.basePath), 'utf-8')
  return { generatedFiles: ['robots.txt'], notes: [] }
}
