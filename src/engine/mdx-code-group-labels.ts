type MdxNode = {
  type: string
  name?: string
  lang?: string
  meta?: string
  attributes?: MdxAttribute[]
  children?: MdxNode[]
}

type MdxAttribute = {
  type: string
  name?: string
  value?: unknown
}

function walk(node: MdxNode | undefined, visit: (node: MdxNode) => void) {
  if (!node) return
  visit(node)
  if (!node.children) return
  for (const child of node.children) {
    walk(child, visit)
  }
}

function getLabelFromCode(node: MdxNode, index: number) {
  const metaLabel = node.meta?.trim().split(/\s+/)[0]
  if (metaLabel) return metaLabel
  if (node.lang) return node.lang
  return `Tab ${index + 1}`
}

function setLabelsAttribute(node: MdxNode, labels: string[]) {
  if (!labels.length) return
  const attributes = node.attributes ?? []
  const existing = attributes.find(
    (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'labels',
  )
  if (existing) return
  attributes.push({
    type: 'mdxJsxAttribute',
    name: 'labels',
    value: labels.join('|'),
  })
  node.attributes = attributes
}

export function createMdxCodeGroupLabelsPlugin() {
  return function mdxCodeGroupLabelsPlugin() {
    return function transformer(tree: MdxNode) {
      walk(tree, (node) => {
        if (node.type !== 'mdxJsxFlowElement' || node.name !== 'CodeGroup') return
        const labels: string[] = []
        const children = node.children ?? []
        for (const child of children) {
          if (child.type !== 'code') continue
          labels.push(getLabelFromCode(child, labels.length))
        }
        setLabelsAttribute(node, labels)
      })
    }
  }
}
