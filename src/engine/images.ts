import path from 'node:path'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

/**
 * Image optimization for the build output.
 *
 * Images are re-encoded in place, in the same format and under the same file name, so
 * every reference (HTML, the .md copies of posts, RSS, links from other sites) stays
 * valid. Source files in the project are never touched.
 */

/** Wider than any article column at 2x density; larger images are scaled down. */
export const MAX_IMAGE_WIDTH = 1600
/** Keep a re-encoded file only when it saves at least this share of the original. */
const MIN_SAVING_RATIO = 0.1
const CONCURRENCY = 4
const OPTIMIZABLE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

export interface ImageOptimizeResult {
  before: number
  after: number
  /** False when the file was left as is (already small, animated, or not smaller). */
  changed: boolean
}

export interface OutputImagesSummary {
  scanned: number
  optimized: number
  bytesBefore: number
  bytesAfter: number
}

export function isOptimizableImage(filePath: string): boolean {
  return OPTIMIZABLE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

/** Re-encode one image: scale down to MAX_IMAGE_WIDTH and compress in its own format. */
export async function optimizeImageBuffer(input: Buffer, ext: string): Promise<Buffer | null> {
  const image = sharp(input, { animated: true })
  const meta = await image.metadata()
  // Animated images (multi-page WebP) would lose frames or grow; leave them alone
  if ((meta.pages ?? 1) > 1 || !meta.width) return null

  const pipeline = sharp(input).rotate()
  if (meta.width > MAX_IMAGE_WIDTH)
    pipeline.resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })

  switch (ext.toLowerCase()) {
    case '.webp':
      return pipeline.webp({ quality: 82, effort: 4 }).toBuffer()
    case '.jpg':
    case '.jpeg':
      return pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    case '.png':
      // Palette PNG (like pngquant): large savings on screenshots, near-lossless on text
      return pipeline.png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 }).toBuffer()
    default:
      return null
  }
}

/** Optimize one file in place. Never throws: a broken image is left as is. */
export async function optimizeImageFile(
  filePath: string,
  options: { dryRun?: boolean } = {},
): Promise<ImageOptimizeResult> {
  const input = await readFile(filePath)
  const before = input.length
  try {
    const output = await optimizeImageBuffer(input, path.extname(filePath))
    if (output && output.length <= before * (1 - MIN_SAVING_RATIO)) {
      if (!options.dryRun) await writeFile(filePath, output)
      return { before, after: output.length, changed: true }
    }
  } catch {
    // Unsupported or corrupt image: keep the original bytes
  }
  return { before, after: before, changed: false }
}

/**
 * Optimize every raster image in the build output, except the directories listed in
 * `skipDirs` (relative to outDir, e.g. generated share images that are already small).
 */
export async function optimizeOutputImages(
  outDir: string,
  skipDirs: string[] = [],
): Promise<OutputImagesSummary> {
  const entries = await readdir(outDir, { recursive: true })
  const skip = skipDirs.map((dir) => dir.replace(/\/+$/, '') + path.sep)
  const files = entries
    .map(String)
    .filter((entry) => isOptimizableImage(entry) && !skip.some((dir) => entry.startsWith(dir)))
    .map((entry) => path.join(outDir, entry))

  const summary: OutputImagesSummary = {
    scanned: files.length,
    optimized: 0,
    bytesBefore: 0,
    bytesAfter: 0,
  }
  let next = 0
  const worker = async () => {
    while (next < files.length) {
      const result = await optimizeImageFile(files[next++]!)
      summary.bytesBefore += result.before
      summary.bytesAfter += result.after
      if (result.changed) summary.optimized++
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker))
  return summary
}

/**
 * Encode a new image for a post as WebP, scaled down to MAX_IMAGE_WIDTH. Returns null
 * for formats that should be copied as they are (SVG, GIF, animations).
 */
export async function encodeAsWebp(input: Buffer, ext: string): Promise<Buffer | null> {
  if (!isOptimizableImage(`x${ext}`)) return null
  try {
    return await optimizeImageBuffer(input, '.webp')
  } catch {
    return null
  }
}
