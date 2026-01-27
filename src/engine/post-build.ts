import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BlogConfig } from './config.js'
import { readAllPosts } from './content.js'
import { generateRobotsTxt } from './generators/robots-txt.js'
import { generateLlmsTxt, generateLlmsFullTxt } from './generators/llms-txt.js'
import { generateSkillMd } from './generators/skill-md.js'

export interface PostBuildResult {
  generatedFiles: string[]
  totalSize: number
}

/**
 * Run post-build processing to generate additional static artifacts.
 * Writes robots.txt, llms.txt, llms-full.txt, and skill.md to the output directory.
 */
export async function runPostBuild(
  blogConfig: BlogConfig,
  contentDir: string,
  outDir: string,
): Promise<PostBuildResult> {
  const posts = await readAllPosts(contentDir, {
    defaultLanguage: blogConfig.defaultLanguage,
    languages: blogConfig.languages,
  })
  const generatedFiles: string[] = []
  let totalSize = 0

  // Always generate robots.txt
  const robotsTxt = generateRobotsTxt(blogConfig.siteUrl)
  const robotsPath = path.join(outDir, 'robots.txt')
  await writeFile(robotsPath, robotsTxt, 'utf-8')
  generatedFiles.push('robots.txt')
  totalSize += Buffer.byteLength(robotsTxt, 'utf-8')

  // Generate llms.txt + llms-full.txt if enabled
  if (blogConfig.llmsText) {
    const llmsTxt = generateLlmsTxt(blogConfig, posts, blogConfig.siteUrl)
    const llmsPath = path.join(outDir, 'llms.txt')
    await writeFile(llmsPath, llmsTxt, 'utf-8')
    generatedFiles.push('llms.txt')
    totalSize += Buffer.byteLength(llmsTxt, 'utf-8')

    const llmsFullTxt = generateLlmsFullTxt(blogConfig, posts)
    const llmsFullPath = path.join(outDir, 'llms-full.txt')
    await writeFile(llmsFullPath, llmsFullTxt, 'utf-8')
    generatedFiles.push('llms-full.txt')
    totalSize += Buffer.byteLength(llmsFullTxt, 'utf-8')
  }

  // Generate skill.md if enabled
  if (blogConfig.skillMd) {
    const skillMd = generateSkillMd(blogConfig, posts)
    const skillPath = path.join(outDir, 'skill.md')
    await writeFile(skillPath, skillMd, 'utf-8')
    generatedFiles.push('skill.md')
    totalSize += Buffer.byteLength(skillMd, 'utf-8')
  }

  return { generatedFiles, totalSize }
}
