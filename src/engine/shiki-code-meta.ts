type ShikiTransformerContext = {
  options?: {
    meta?: unknown
  }
}

type ShikiTransformer = {
  name?: string
  pre?: (this: ShikiTransformerContext, hast: { properties?: Record<string, unknown> }) => void
}

function normalizeMeta(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') {
    const raw = (value as { __raw?: unknown }).__raw
    if (typeof raw === 'string') return raw.trim()
  }
  return undefined
}

export function createShikiMetaTransformer(): ShikiTransformer {
  return {
    name: 'code-meta',
    pre(hast) {
      const meta = normalizeMeta(this.options?.meta)
      if (!meta) return
      hast.properties ??= {}
      hast.properties['data-meta'] = meta
    },
  }
}
