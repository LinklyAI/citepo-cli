type MdxRoot = {
  type: string
  children?: MdxNode[]
}

type MdxNode = {
  type: string
  name?: string
  value?: string
  data?: {
    estree?: unknown
  }
  attributes?: MdxAttribute[]
  children?: MdxNode[]
}

type MdxAttribute = {
  type: string
  name?: string
  value?: unknown
}

const JSX_ELEMENT_TYPES = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement'])

function walk(node: MdxNode | MdxRoot | undefined, visit: (node: MdxNode) => void) {
  if (!node || typeof node !== 'object') return

  if ('type' in node && typeof node.type === 'string') {
    visit(node as MdxNode)
  }

  const children = (node as MdxNode).children
  if (!children || !Array.isArray(children)) return

  for (const child of children) {
    walk(child, visit)
  }
}

function hasClientDirective(attributes: MdxAttribute[] | undefined) {
  if (!attributes) return false
  return attributes.some(
    (attr) =>
      attr?.type === 'mdxJsxAttribute' &&
      typeof attr.name === 'string' &&
      attr.name.startsWith('client:'),
  )
}

function collectImportedNames(value: string) {
  const imported = new Set<string>()
  const importRegex = /import\s*{([^}]+)}\s*from\s*['"]@mdx['"]/g
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(value))) {
    if (!match[1]) continue
    const names = match[1]
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => name.split(/\s+as\s+/)[0]?.trim())

    for (const name of names) {
      if (name) imported.add(name)
    }
  }

  return imported
}

export function createMdxClientDirectivePlugin(components: string[]) {
  const componentSet = new Set(components)

  return function mdxClientDirectivePlugin() {
    return function transformer(tree: MdxRoot) {
      const usedComponents = new Set<string>()
      const importedComponents = new Set<string>()

      walk(tree, (node) => {
        if (node.type !== 'mdxjsEsm' || typeof node.value !== 'string') return
        const names = collectImportedNames(node.value)
        for (const name of names) importedComponents.add(name)
      })

      walk(tree, (node) => {
        if (!JSX_ELEMENT_TYPES.has(node.type)) return
        if (!node.name || !componentSet.has(node.name)) return

        const attributes = node.attributes ?? []
        const hasClient = hasClientDirective(attributes)

        if (!hasClient) {
          attributes.push({
            type: 'mdxJsxAttribute',
            name: 'client:load',
            value: null,
          })
          node.attributes = attributes
        }

        usedComponents.add(node.name)
      })

      const missingImports = [...usedComponents].filter(
        (component) => !importedComponents.has(component),
      )

      if (missingImports.length === 0) return
      const importSpecifiers = missingImports.map((name) => ({
        type: 'ImportSpecifier',
        imported: { type: 'Identifier', name },
        local: { type: 'Identifier', name },
      }))

      const importNode: MdxNode = {
        type: 'mdxjsEsm',
        value: `import { ${missingImports.join(', ')} } from '@mdx'`,
        data: {
          estree: {
            type: 'Program',
            sourceType: 'module',
            body: [
              {
                type: 'ImportDeclaration',
                source: { type: 'Literal', value: '@mdx', raw: "'@mdx'" },
                specifiers: importSpecifiers,
              },
            ],
          },
        },
      }

      if (!tree.children) {
        tree.children = [importNode]
        return
      }

      let insertIndex = 0
      while (
        insertIndex < tree.children.length &&
        ['yaml', 'mdxjsEsm'].includes(tree.children[insertIndex]?.type ?? '')
      ) {
        insertIndex += 1
      }

      tree.children.splice(insertIndex, 0, importNode)
    }
  }
}
