import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { isMultiLang, filterPostsByLang, getPostSlug } from '../lib/i18n.ts'
import { readFile } from 'node:fs/promises'

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft)

  if (!isMultiLang(blogConfig)) {
    return posts.map((post) => ({
      params: { slug: getPostSlug(post.id, blogConfig) },
      props: { post },
    }))
  }

  // Multi-lang: default language posts are served at root
  const defaultLang = blogConfig.defaultLanguage
  const defaultPosts = filterPostsByLang(posts, defaultLang, blogConfig)
  return defaultPosts.map((post) => ({
    params: { slug: getPostSlug(post.id, blogConfig) },
    props: { post },
  }))
}

export const GET: APIRoute = async ({ props }) => {
  const post = props.post as { id: string; filePath?: string; body?: string }

  // Try reading the original MDX file
  let content = ''
  if (post.filePath) {
    try {
      content = await readFile(post.filePath, 'utf-8')
    } catch {
      content = post.body ?? ''
    }
  } else {
    content = post.body ?? ''
  }

  return new Response(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
