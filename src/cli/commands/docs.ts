import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Command } from 'commander'
import { CliError } from '../error.js'
import { renderTable, style } from '../output.js'
import { action, type CommandOutcome } from '../run.js'
import { getPackageRoot } from '../utils.js'

/**
 * Writing reference for the installed version. The same files are the references of the
 * citepo agent skill (skills/citepo/references/), so both always say the same thing.
 */
export const DOC_TOPICS = {
  frontmatter: 'Post files, URLs, frontmatter fields, images and links',
  components: 'MDX components (Callout, Card, Steps, CodeGroup, ...) with examples',
  config: 'blog.json fields, style.css and asset/',
  publish: 'Checking before a push, how publishing works, hosted limits',
} as const

export type DocTopic = keyof typeof DOC_TOPICS

type DocsResult =
  | { topics: { name: string; summary: string }[] }
  | { topic: string; content: string }

export function docPath(topic: DocTopic): string {
  return path.join(getPackageRoot(), 'skills', 'citepo', 'references', `${topic}.md`)
}

export const docsCommand = new Command('docs')
  .description('Show the writing reference for this version of citepo')
  .argument('[topic]', `one of: ${Object.keys(DOC_TOPICS).join(', ')}`)
  .action(
    action(async (_ctx, topic: string | undefined): Promise<CommandOutcome<DocsResult>> => {
      if (!topic) {
        const topics = Object.entries(DOC_TOPICS).map(([name, summary]) => ({ name, summary }))
        return {
          data: { topics },
          render: () =>
            `\n${renderTable(
              ['Topic', 'Contents'],
              topics.map((t) => [style.cyan(t.name), t.summary]),
            )}\n\n  Run ${style.cyan('citepo docs <topic>')} to read one.\n`,
        }
      }
      if (!(topic in DOC_TOPICS)) {
        throw new CliError({
          code: 'unknown_topic',
          message: `Unknown topic "${topic}"`,
          expected: Object.keys(DOC_TOPICS).join(' | '),
        })
      }
      const content = await readFile(docPath(topic as DocTopic), 'utf-8')
      return { data: { topic, content }, render: () => content }
    }),
  )
