import { visit } from 'unist-util-visit'

type MdxAttribute = { type: 'mdxJsxAttribute'; name: string; value?: unknown }
type MdxJsxNode = {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
  name?: string | null
  attributes?: MdxAttribute[]
}

const hasClientDirective = (attributes?: MdxAttribute[]) =>
  attributes?.some(
    (attr) => attr.type === 'mdxJsxAttribute' && typeof attr.name === 'string' && attr.name.startsWith('client:'),
  )

export function createMdxClientDirectivePlugin(whitelist: string[]) {
  const whitelistSet = new Set(whitelist)

  return () => (tree: unknown) => {
    visit(
      tree as object,
      ['mdxJsxFlowElement', 'mdxJsxTextElement'],
      (node: MdxJsxNode) => {
        const name = node.name
        if (!name || !whitelistSet.has(name)) return

        const attributes = node.attributes ?? []
        if (hasClientDirective(attributes)) return

        attributes.push({ type: 'mdxJsxAttribute', name: 'client:load' })
        node.attributes = attributes
      },
    )
  }
}
