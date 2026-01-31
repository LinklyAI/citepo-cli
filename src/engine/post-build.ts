import { writeFile, mkdir } from 'node:fs/promises'
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
  siteUrl?: string,
): Promise<PostBuildResult> {
  const posts = await readAllPosts(contentDir, {
    defaultLanguage: blogConfig.defaultLanguage,
    languages: blogConfig.languages,
  })
  const generatedFiles: string[] = []
  let totalSize = 0
  const defaultLang = blogConfig.defaultLanguage
  const languages = blogConfig.languages && blogConfig.languages.length > 0
    ? blogConfig.languages
    : [defaultLang]
  const postsByLang = new Map<string, typeof posts>()
  for (const post of posts) {
    const langPosts = postsByLang.get(post.lang) ?? []
    langPosts.push(post)
    postsByLang.set(post.lang, langPosts)
  }

  const writeOutputFile = async (relativePath: string, content: string) => {
    const filePath = path.join(outDir, relativePath)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content, 'utf-8')
    generatedFiles.push(relativePath)
    totalSize += Buffer.byteLength(content, 'utf-8')
  }

  // Always generate robots.txt
  const robotsTxt = generateRobotsTxt(siteUrl, blogConfig.basePath)
  await writeOutputFile('robots.txt', robotsTxt)

  // Generate llms.txt + llms-full.txt if enabled
  if (blogConfig.llmsText) {
    const defaultPosts = postsByLang.get(defaultLang) ?? []
    const llmsTxt = generateLlmsTxt(blogConfig, defaultPosts, siteUrl)
    await writeOutputFile('llms.txt', llmsTxt)

    const llmsFullTxt = generateLlmsFullTxt(blogConfig, defaultPosts)
    await writeOutputFile('llms-full.txt', llmsFullTxt)

    for (const lang of languages) {
      if (lang === defaultLang) continue
      const langPosts = postsByLang.get(lang) ?? []
      const langDir = `${lang}`
      const langLlmsTxt = generateLlmsTxt(blogConfig, langPosts, siteUrl)
      await writeOutputFile(path.join(langDir, 'llms.txt'), langLlmsTxt)

      const langLlmsFullTxt = generateLlmsFullTxt(blogConfig, langPosts)
      await writeOutputFile(path.join(langDir, 'llms-full.txt'), langLlmsFullTxt)
    }
  }

  // Generate skill.md if enabled
  if (blogConfig.skillMd) {
    const defaultPosts = postsByLang.get(defaultLang) ?? []
    const skillMd = generateSkillMd(blogConfig, defaultPosts, { language: defaultLang })
    await writeOutputFile('skill.md', skillMd)

    for (const lang of languages) {
      if (lang === defaultLang) continue
      const langPosts = postsByLang.get(lang) ?? []
      const langDir = `${lang}`
      const langSkillMd = generateSkillMd(blogConfig, langPosts, { language: lang })
      await writeOutputFile(path.join(langDir, 'skill.md'), langSkillMd)
    }
  }

  return { generatedFiles, totalSize }
}
