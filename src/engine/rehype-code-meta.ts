type HastNode = {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  data?: Record<string, unknown>
  children?: HastNode[]
}

function walk(node: HastNode | undefined, visit: (node: HastNode) => void) {
  if (!node) return
  visit(node)
  if (!node.children) return
  for (const child of node.children) {
    walk(child, visit)
  }
}

function normalizeMeta(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join(' ')
  return undefined
}

export function createRehypeCodeMetaPlugin() {
  return function rehypeCodeMetaPlugin() {
    return function transformer(tree: HastNode) {
      walk(tree, (node) => {
        if (node.type !== 'element' || node.tagName !== 'pre') return
        const code = node.children?.find(
          (child) => child.type === 'element' && child.tagName === 'code',
        )
        if (!code) return

        const meta =
          normalizeMeta(code.properties?.metastring) ??
          normalizeMeta(code.properties?.['data-meta']) ??
          normalizeMeta(code.properties?.dataMeta) ??
          normalizeMeta(code.data?.meta)

        if (!meta) return

        node.properties ??= {}
        code.properties ??= {}
        node.properties['data-meta'] = meta
        code.properties['data-meta'] = meta
      })
    }
  }
}
