import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

/**
 * MDX parsing for `citepo check`.
 *
 * The MDX compiler is loaded from @astrojs/mdx's own dependencies, so `check` parses
 * posts with exactly the MDX version that the build uses.
 */

/** Components registered for every post (see src/astro-project/src/pages/[...slug].astro). */
export const MDX_COMPONENT_NAMES = [
  'Accordion',
  'AccordionGroup',
  'Badge',
  'Callout',
  'Card',
  'CardGroup',
  'CodeGroup',
  'Step',
  'Steps',
] as const

export interface MdxReference {
  url: string
  line: number
  /** Set for `<img src>`: only root-absolute paths work there (no relative rewriting). */
  jsx?: boolean
}

export interface MdxAnalysis {
  /** Set when the file does not parse; the other lists are then empty. */
  syntaxError?: { message: string; line: number }
  /** Capitalized JSX elements that are not registered components. */
  unknownComponents: { name: string; line: number }[]
  images: MdxReference[]
  links: MdxReference[]
}

interface MdastNode {
  type: string
  name?: string | null
  url?: string
  identifier?: string
  attributes?: { type: string; name?: string; value?: unknown }[]
  children?: MdastNode[]
  position?: { start: { line: number } }
}

interface MdxProcessor {
  parse(source: string): MdastNode
}

let processorPromise: Promise<MdxProcessor> | undefined

async function getProcessor(): Promise<MdxProcessor> {
  processorPromise ??= (async () => {
    const requireFromCli = createRequire(import.meta.url)
    const requireFromAstroMdx = createRequire(requireFromCli.resolve('@astrojs/mdx'))
    const entry = requireFromAstroMdx.resolve('@mdx-js/mdx')
    const mdx = (await import(pathToFileURL(entry).href)) as {
      createProcessor: (options?: object) => MdxProcessor
    }
    return mdx.createProcessor()
  })()
  return processorPromise
}

/**
 * Replace the frontmatter block with empty lines, so MDX does not parse YAML as
 * Markdown and line numbers still match the original file.
 */
export function blankFrontmatter(source: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/.exec(source)
  if (!match) return source
  return match[0].replace(/[^\n]/g, '') + source.slice(match[0].length)
}

const KNOWN_COMPONENTS = new Set<string>(MDX_COMPONENT_NAMES)

/** Parse one post and collect what `check` validates: syntax, components, images, links. */
export async function analyzeMdx(source: string): Promise<MdxAnalysis> {
  const result: MdxAnalysis = { unknownComponents: [], images: [], links: [] }
  let tree: MdastNode
  try {
    tree = (await getProcessor()).parse(blankFrontmatter(source))
  } catch (err) {
    const error = err as {
      reason?: string
      message?: string
      line?: number
      place?: { line?: number; start?: { line?: number } }
    }
    const line = error.line ?? error.place?.line ?? error.place?.start?.line ?? 1
    result.syntaxError = { message: error.reason ?? error.message ?? String(err), line }
    return result
  }

  // Reference-style links and images ([text][id] with "[id]: url" elsewhere)
  const definitions = new Map<string, string>()
  const collect = (node: MdastNode) => {
    if (node.type === 'definition' && node.identifier && node.url) {
      definitions.set(node.identifier, node.url)
    }
    for (const child of node.children ?? []) collect(child)
  }
  collect(tree)

  const visit = (node: MdastNode) => {
    const line = node.position?.start.line ?? 1
    if (node.type === 'image' && node.url) result.images.push({ url: node.url, line })
    if (node.type === 'link' && node.url) result.links.push({ url: node.url, line })
    const referenced = node.identifier ? definitions.get(node.identifier) : undefined
    if (node.type === 'imageReference' && referenced) result.images.push({ url: referenced, line })
    if (node.type === 'linkReference' && referenced) result.links.push({ url: referenced, line })

    if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name) {
      const name = node.name
      if (/^[A-Z]/.test(name) && !KNOWN_COMPONENTS.has(name))
        result.unknownComponents.push({ name, line })
      for (const attr of node.attributes ?? []) {
        if (attr.type !== 'mdxJsxAttribute' || typeof attr.value !== 'string') continue
        if (attr.name === 'src' && (name === 'img' || name === 'Img'))
          result.images.push({ url: attr.value, line, jsx: true })
        if (attr.name === 'href') result.links.push({ url: attr.value, line })
      }
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(tree)
  return result
}
