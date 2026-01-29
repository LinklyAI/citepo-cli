import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { isMultiLang, getAllLanguages, filterPostsByLang, getPostSlug, getPostLang } from '../../lib/i18n.ts'
import { readFile } from 'node:fs/promises'

export const getStaticPaths: GetStaticPaths = async () => {
  if (!isMultiLang(blogConfig)) return []

  const posts = await getCollection('blog', ({ data }) => !data.draft)
  const paths: { params: { lang: string; slug: string }; props: { post: typeof posts[number] } }[] = []

  for (const lang of getAllLanguages(blogConfig)) {
    const langPosts = filterPostsByLang(posts, lang, blogConfig)
    for (const post of langPosts) {
      paths.push({
        params: { lang, slug: getPostSlug(post.id, blogConfig) },
        props: { post },
      })
    }
  }

  return paths
}

export const GET: APIRoute = async ({ props }) => {
  const post = props.post as { id: string; filePath?: string; body?: string }

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
