import sharp from 'sharp'

/**
 * Share images (og:image) are PNG files generated at build time.
 *
 * Social networks do not render SVG previews, and rasterizing inside the Cloudflare
 * Worker hangs (resvg wasm), so the worker only returns the SVG (text already
 * converted to paths, so no fonts are needed here) and the build turns it into PNG.
 */
export const DEFAULT_OG_ENDPOINT = 'https://og.citepo.app/og-image.png'

const OG_WIDTH = 1200
const OG_HEIGHT = 630
const FETCH_TIMEOUT_MS = 15_000
/** Upper bound for all cards together, so share images never dominate the build time. */
const TOTAL_BUDGET_MS = 45_000
const CONCURRENCY = 8

export interface OgImageInput {
  title: string
  author?: string
  site: string
  theme?: string
}

/** Fetch the SVG card from the worker and convert it to PNG. Throws on any failure. */
export async function renderOgPng(
  input: OgImageInput,
  endpoint = ogEndpoint(),
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Buffer> {
  const params = new URLSearchParams({
    title: input.title,
    ...(input.author ? { author: input.author } : {}),
    site: input.site,
    ...(input.theme ? { theme: input.theme } : {}),
  })
  const res = await fetch(`${endpoint}?${params.toString()}`, { signal: AbortSignal.timeout(timeoutMs) })
  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok || !contentType.includes('svg')) {
    throw new Error(`OG endpoint returned ${res.status} ${contentType}`)
  }
  const svg = Buffer.from(await res.arrayBuffer())
  return sharp(svg).resize(OG_WIDTH, OG_HEIGHT).png().toBuffer()
}

let fallbackPng: Promise<Buffer> | undefined

/** Plain card used when the SVG cannot be fetched (offline build, endpoint down). */
export function fallbackOgPng(): Promise<Buffer> {
  fallbackPng ??= sharp({
    create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 3, background: '#faf9f7' },
  })
    .png()
    .toBuffer()
  return fallbackPng
}

/**
 * Render many cards with bounded concurrency and a total time budget. Never throws:
 * failed or late cards fall back to the plain card, and a single warning is printed so
 * the build log stays short.
 */
export async function renderOgPngs(inputs: OgImageInput[]): Promise<Buffer[]> {
  const results: Buffer[] = new Array(inputs.length)
  const deadline = Date.now() + TOTAL_BUDGET_MS
  let failures = 0
  let lastError = ''
  let next = 0

  const worker = async () => {
    while (next < inputs.length) {
      const i = next++
      try {
        const remaining = deadline - Date.now()
        if (remaining <= 0) throw new Error('time budget for share images used up')
        results[i] = await renderOgPng(inputs[i]!, ogEndpoint(), Math.min(FETCH_TIMEOUT_MS, remaining))
      } catch (err) {
        failures++
        lastError = err instanceof Error ? err.message : String(err)
        results[i] = await fallbackOgPng()
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, inputs.length) }, worker))

  if (failures > 0) {
    console.warn(`  ⚠ ${failures}/${inputs.length} share images used a plain fallback (${lastError})`)
  }
  return results
}

function ogEndpoint(): string {
  return process.env.CITEPO_OG_ENDPOINT || DEFAULT_OG_ENDPOINT
}
