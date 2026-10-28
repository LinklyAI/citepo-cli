import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { getPostUrl } from '../../lib/i18n.ts'
import { OG_INDEX_SLUG, stripBasePath } from '../../lib/layout-meta.ts'
import { renderOgPngs, type OgImageInput } from '../../../../engine/og-image.js'

/**
 * Share images: one PNG per post at {basePath}/og/{post path}.png, plus
 * {basePath}/og/index.png for the other pages. All cards are rendered up front so
 * the network calls run in parallel instead of one route at a time.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft)
  const site = blogConfig.name
  const theme = blogConfig.theme

  const cards: { slug: string; input: OgImageInput }[] = [
    { slug: OG_INDEX_SLUG, input: { title: site, site, theme } },
    ...posts.map((post) => ({
      slug: stripBasePath(getPostUrl(post.id, blogConfig), blogConfig.basePath).replace(/^\//, ''),
      input: { title: post.data.title, author: post.data.authors[0], site, theme },
    })),
  ]
  const images = await renderOgPngs(cards.map((card) => card.input))

  return cards.map((card, i) => ({ params: { slug: card.slug }, props: { png: images[i] } }))
}

export const GET: APIRoute = ({ props }) => {
  return new Response(new Uint8Array(props.png as Buffer), {
    headers: { 'Content-Type': 'image/png' },
  })
}
