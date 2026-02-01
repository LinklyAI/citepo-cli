type MdxNode = {
  type: string
  meta?: string
  data?: {
    hProperties?: Record<string, unknown>
    meta?: string
  }
  children?: MdxNode[]
}

function walk(node: MdxNode | undefined, visit: (node: MdxNode) => void) {
  if (!node) return
  visit(node)
  if (!node.children) return
  for (const child of node.children) {
    walk(child, visit)
  }
}

export function createMdxCodeMetaPlugin() {
  return function mdxCodeMetaPlugin() {
    return function transformer(tree: MdxNode) {
      walk(tree, (node) => {
        if (node.type !== 'code') return
        if (!node.meta) return
        const data = (node.data ??= {})
        data.meta = node.meta
        const props = (data.hProperties ??= {})
        props['data-meta'] = node.meta
      })
    }
  }
}
