import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { isMultiLang, getPostSlug } from '../lib/i18n.ts'
import { readFile } from 'node:fs/promises'

export const getStaticPaths: GetStaticPaths = async () => {
  if (isMultiLang(blogConfig)) return []

  const posts = await getCollection('blog', ({ data }) => !data.draft)
  return posts.map((post) => ({
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
