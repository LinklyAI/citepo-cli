import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'

export const GET: APIRoute = async () => {
  const config = blogConfig
  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const sorted = allPosts.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  )

  const lines: string[] = []

  lines.push(`# ${config.name}`)
  lines.push('')
  if (config.description) {
    lines.push(`> ${config.description}`)
    lines.push('')
  }

  for (let i = 0; i < sorted.length; i++) {
    const post = sorted[i]!
    lines.push(`## ${post.data.title}`)
    lines.push('')
    lines.push(post.body ?? '')

    if (i < sorted.length - 1) {
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  lines.push('')

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
