import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { isMultiLang, getNonDefaultLanguages, filterPostsByLang, getPostSlug } from '../../lib/i18n.ts'
import { renderPostMarkdown, type BlogEntryLike } from '../../lib/post-data.ts'

export const getStaticPaths: GetStaticPaths = async () => {
  if (!isMultiLang(blogConfig)) return []

  const posts = await getCollection('blog', ({ data }) => !data.draft)
  const paths: { params: { lang: string; slug: string }; props: { post: typeof posts[number] } }[] = []

  for (const lang of getNonDefaultLanguages(blogConfig)) {
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
  return new Response(renderPostMarkdown(props.post as BlogEntryLike), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
