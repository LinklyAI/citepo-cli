import { Command } from 'commander'
import { loadBlogConfig } from '../../engine/config.js'
import { listPosts, summarizeTags, type TagSummary } from '../../engine/posts.js'
import { mark, renderTable, style } from '../output.js'
import { action } from '../run.js'

const listTagsCommand = new Command('list')
  .description('List tags with post counts; flags spellings that differ only in case')
  .action(
    action(async () => {
      const projectDir = process.cwd()
      const tags = summarizeTags(await listPosts(projectDir, await loadBlogConfig(projectDir)))
      return { data: { tags }, render: () => renderTags(tags) }
    }),
  )

function renderTags(tags: TagSummary[]): string {
  if (tags.length === 0) return '\n  No tags yet.\n'
  const rows = tags.map((t) => [
    String(t.count),
    t.tag,
    t.variants.length > 0 ? `${mark.warn()} also spelled ${t.variants.join(', ')}` : '',
  ])
  return `\n${renderTable(['Posts', 'Tag', ''], rows)}\n\n  ${style.dim(`${tags.length} tags`)}\n`
}

export const tagCommand = new Command('tag').description('List tags').addCommand(listTagsCommand)
