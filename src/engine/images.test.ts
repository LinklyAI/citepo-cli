import { randomBytes } from 'node:crypto'
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  encodeAsWebp,
  isAnimatedPng,
  MAX_IMAGE_WIDTH,
  needsOptimizing,
  optimizeImageBuffer,
  optimizeImageFile,
  optimizeOutputImages,
} from './images.js'

/** A noisy image compresses badly, like a photo or a detailed screenshot. */
async function noisyImage(width: number, height: number): Promise<sharp.Sharp> {
  const pixels = randomBytes(width * height * 3)
  return sharp(pixels, { raw: { width, height, channels: 3 } })
}

describe('image optimization', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'citepo-images-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('scales down wide images and keeps the format and name', async () => {
    const file = path.join(dir, 'wide.webp')
    await (await noisyImage(3000, 400)).webp({ lossless: true }).toFile(file)

    const result = await optimizeImageFile(file)
    expect(result.changed).toBe(true)
    expect(result.after).toBeLessThan(result.before)
    const meta = await sharp(file).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(MAX_IMAGE_WIDTH)
  })

  it('leaves small, already compact images untouched', async () => {
    const file = path.join(dir, 'small.png')
    await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
      .png()
      .toFile(file)
    const before = (await stat(file)).size
    const result = await optimizeImageFile(file)
    expect(result.changed).toBe(false)
    expect((await stat(file)).size).toBe(before)
  })

  it('keeps corrupt files as they are', async () => {
    const file = path.join(dir, 'broken.jpg')
    await writeFile(file, 'not an image')
    expect(await optimizeImageFile(file)).toEqual({ before: 12, after: 12, changed: false })
  })

  it('walks the output and skips listed directories', async () => {
    await mkdir(path.join(dir, 'images'), { recursive: true })
    await mkdir(path.join(dir, 'og'), { recursive: true })
    const image = await (await noisyImage(2400, 300)).jpeg({ quality: 100 }).toBuffer()
    await writeFile(path.join(dir, 'images', 'a.jpg'), image)
    await writeFile(path.join(dir, 'og', 'card.jpg'), image)

    const summary = await optimizeOutputImages(dir, ['og'])
    expect(summary.scanned).toBe(1)
    expect(summary.optimized).toBe(1)
    expect((await stat(path.join(dir, 'og', 'card.jpg'))).size).toBe(image.length)
  })

  it('reports without writing in dry-run mode', async () => {
    const file = path.join(dir, 'wide.jpg')
    await (await noisyImage(2400, 300)).jpeg({ quality: 100 }).toFile(file)
    const before = (await stat(file)).size
    const result = await optimizeImageFile(file, { dryRun: true })
    expect(result.changed).toBe(true)
    expect((await stat(file)).size).toBe(before)
  })

  it('encodes new images as WebP and passes SVG through', async () => {
    const png = await (await noisyImage(2000, 100)).png().toBuffer()
    const webp = await encodeAsWebp(png, '.png')
    expect((await sharp(webp!).metadata()).format).toBe('webp')
    expect(await encodeAsWebp(Buffer.from('<svg/>'), '.svg')).toBeNull()
  })

  it('leaves animated PNG alone and keeps narrow PNG sources lossless', async () => {
    const png = await (await noisyImage(2000, 100)).png().toBuffer()
    // Mark it as APNG: an acTL chunk before the first IDAT
    const idat = png.indexOf('IDAT') - 4
    const apng = Buffer.concat([
      png.subarray(0, idat),
      Buffer.from('\0\0\0\x08acTL\0\0\0\x02\0\0\0\0\0\0\0\0', 'binary'),
      png.subarray(idat),
    ])
    expect(isAnimatedPng(apng)).toBe(true)
    expect(await optimizeImageBuffer(apng, '.png')).toBeNull()

    const narrowPng = await (await noisyImage(800, 100)).png().toBuffer()
    expect(await optimizeImageBuffer(narrowPng, '.png', 'source')).toBeNull()
    expect(await optimizeImageBuffer(narrowPng, '.png', 'output')).not.toBeNull()
    // A heavy narrow JPEG is worth shrinking in both modes
    const narrowJpeg = await (await noisyImage(800, 100)).jpeg({ quality: 100 }).toBuffer()
    expect(await optimizeImageBuffer(narrowJpeg, '.jpg', 'source')).not.toBeNull()
  })

  it('skips images that are narrow enough and already compact, without encoding', () => {
    const meta = { width: 1000, height: 500 }
    // 0.1 bytes per pixel is the line
    expect(needsOptimizing(meta, 50_000, '.webp', 'output')).toBe(false)
    expect(needsOptimizing(meta, 50_001, '.webp', 'output')).toBe(true)
    expect(needsOptimizing({ width: 2000, height: 500 }, 1_000, '.webp', 'output')).toBe(true)
    expect(needsOptimizing({ width: 1000, height: 500, pages: 3 }, 9e6, '.webp', 'output')).toBe(
      false,
    )
    expect(needsOptimizing(meta, 1_000, '.webp', 'new')).toBe(true)
  })

  it('measures width after EXIF rotation', async () => {
    const portrait = await (await noisyImage(1200, 2400))
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const out = await optimizeImageBuffer(portrait, '.jpg')
    const meta = await sharp(out!).metadata()
    expect(meta.width).toBe(MAX_IMAGE_WIDTH)
  })
})
