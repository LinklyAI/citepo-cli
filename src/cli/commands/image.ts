import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Command } from 'commander'
import { loadBlogConfig } from '../../engine/config.js'
import { encodeAsWebp, isOptimizableImage, optimizeImageFile } from '../../engine/images.js'
import { CONTENT_IMAGES_DIR } from '../../engine/remark-relative-images.js'
import { CliError } from '../error.js'
import { formatSize, mark, renderTable, style } from '../output.js'
import { action } from '../run.js'
import { toKebabCase } from './init.js'

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif'])

interface AddFlags {
  post?: string
  name?: string
  alt?: string
  keepFormat?: boolean
}

export interface ImageAddResult {
  /** Path relative to the project, e.g. "asset/images/hello/diagram.webp". */
  file: string
  /** URL to use in posts, e.g. "/images/hello/diagram.webp". */
  url: string
  markdown: string
  bytesBefore: number
  bytesAfter: number
}

const addImageCommand = new Command('add')
  .description('Copy an image into the blog, compressed, and print the Markdown to paste')
  .argument('<file>', 'image to add (PNG, JPEG, WebP, GIF, SVG)')
  .option('--post <slug>', 'post the image belongs to; it goes to asset/images/<slug>/')
  .option('--name <name>', 'file name without extension (defaults to the source name)')
  .option('--alt <text>', 'alt text for the Markdown snippet')
  .option('--keep-format', 'keep PNG/JPEG instead of converting to WebP')
  .addHelpText(
    'after',
    `
Example:
  citepo image add ~/Desktop/screenshot.png --post hello-world --alt "The settings page"`,
  )
  .action(
    action(async (_ctx, source: string, flags: AddFlags) => {
      const projectDir = process.cwd()
      await loadBlogConfig(projectDir)
      const sourcePath = path.resolve(source)
      const ext = path.extname(sourcePath).toLowerCase()
      if (!existsSync(sourcePath)) {
        throw new CliError({ code: 'file_not_found', message: `${source} not found` })
      }
      if (!IMAGE_EXTENSIONS.has(ext)) {
        throw new CliError({
          code: 'invalid_option',
          message: `${source} is not a supported image`,
          expected: [...IMAGE_EXTENSIONS].join(' '),
        })
      }

      const postSlug = flags.post ? toKebabCase(path.basename(flags.post, '.mdx')) : null
      if (flags.post && !postSlug) {
        throw new CliError({
          code: 'invalid_option',
          message: `Cannot use "${flags.post}" as an image folder name`,
          expected: 'the post slug in lowercase letters, numbers and hyphens',
          hint: 'Pass the file name of the post, e.g. --post hello-world',
        })
      }
      const baseName = toKebabCase(flags.name ?? path.basename(sourcePath, ext)) ?? 'image'
      const input = await readFile(sourcePath)
      const webp = flags.keepFormat ? null : await encodeAsWebp(input, ext)
      const finalExt = webp ? '.webp' : ext
      const relativeUrl = [
        'images',
        ...(postSlug ? [postSlug] : []),
        `${baseName}${finalExt}`,
      ].join('/')
      const target = path.join(projectDir, 'asset', relativeUrl)
      if (existsSync(target)) {
        throw new CliError({
          code: 'file_exists',
          message: `asset/${relativeUrl} already exists`,
          hint: 'Pick another name with --name.',
        })
      }

      await mkdir(path.dirname(target), { recursive: true })
      if (webp) {
        await writeFile(target, webp)
      } else {
        await copyFile(sourcePath, target)
        // Same-format compression for --keep-format and formats WebP does not cover
        await optimizeImageFile(target, { mode: 'source' })
      }

      const url = `/${relativeUrl}`
      const data: ImageAddResult = {
        file: `asset/${relativeUrl}`,
        url,
        markdown: `![${flags.alt ?? ''}](${url})`,
        bytesBefore: input.length,
        bytesAfter: (await stat(target)).size,
      }
      return {
        data,
        render: (d: ImageAddResult) =>
          [
            '',
            `  ${mark.ok()} Added ${style.bold(d.file)} (${formatSize(d.bytesBefore)} → ${formatSize(d.bytesAfter)})`,
            '',
            `  ${d.markdown}`,
            '',
          ].join('\n'),
      }
    }),
  )

interface OptimizeFlags {
  dryRun?: boolean
  minSize: string
}

interface OptimizedFile {
  file: string
  before: number
  after: number
}

const optimizeImagesCommand = new Command('optimize')
  .description('Shrink images in the project in place (same name and format)')
  .argument('[paths...]', 'files or folders (defaults to asset/ and content/)')
  .option('--dry-run', 'only report what would change')
  .option('--min-size <kb>', 'skip images smaller than this', '300')
  .addHelpText(
    'after',
    `
Only images wider than 1600px are changed: scaled down and re-encoded in their own
format (PNG stays lossless), so every reference stays valid. Files are only replaced
when they get at least 10% smaller.
The build already does this for the published site; this shrinks the repository.`,
  )
  .action(
    action(async (_ctx, paths: string[], flags: OptimizeFlags) => {
      const projectDir = process.cwd()
      await loadBlogConfig(projectDir)
      const minBytes = Number(flags.minSize) * 1024
      if (!Number.isFinite(minBytes) || minBytes < 0) {
        throw new CliError({
          code: 'invalid_option',
          message: `Invalid --min-size "${flags.minSize}"`,
          expected: 'a number of KB',
        })
      }

      // Explicit paths must exist; the default folders are skipped when missing
      const roots =
        paths.length > 0
          ? paths.map((p) => path.resolve(p))
          : ['asset', 'content'].map((d) => path.join(projectDir, d)).filter((d) => existsSync(d))
      const files = (await Promise.all(roots.map(collectImages))).flat()

      const changed: OptimizedFile[] = []
      let scanned = 0
      for (const file of files) {
        if ((await stat(file)).size < minBytes) continue
        scanned++
        const result = await optimizeImageFile(file, { dryRun: flags.dryRun, mode: 'source' })
        if (result.changed) {
          changed.push({
            file: path.relative(projectDir, file).split(path.sep).join('/'),
            before: result.before,
            after: result.after,
          })
        }
      }

      const data = {
        dryRun: Boolean(flags.dryRun),
        scanned,
        files: changed,
        bytesBefore: changed.reduce((sum, f) => sum + f.before, 0),
        bytesAfter: changed.reduce((sum, f) => sum + f.after, 0),
      }
      return {
        data,
        render: () => {
          if (changed.length === 0)
            return `\n  ${mark.ok()} Nothing to shrink (${scanned} images checked).\n`
          const rows = changed.map((f) => [f.file, formatSize(f.before), formatSize(f.after)])
          const verb = data.dryRun ? 'Would shrink' : 'Shrank'
          return [
            '',
            renderTable(['File', 'Before', 'After'], rows),
            '',
            `  ${mark.ok()} ${verb} ${changed.length} image${changed.length === 1 ? '' : 's'}: ${formatSize(data.bytesBefore)} → ${formatSize(data.bytesAfter)}`,
            ...(data.dryRun ? [`  Run again without ${style.cyan('--dry-run')} to apply.`] : []),
            '',
          ].join('\n')
        },
      }
    }),
  )

async function collectImages(root: string): Promise<string[]> {
  if (!existsSync(root)) {
    throw new CliError({ code: 'file_not_found', message: `${root} not found` })
  }
  if ((await stat(root)).isFile()) return isOptimizableImage(root) ? [root] : []
  return (await readdir(root, { recursive: true }))
    .map(String)
    .filter(
      (entry) => isOptimizableImage(entry) && !entry.split(path.sep).includes(CONTENT_IMAGES_DIR),
    )
    .map((entry) => path.join(root, entry))
}

export const imageCommand = new Command('image')
  .description('Add and shrink images')
  .addCommand(addImageCommand)
  .addCommand(optimizeImagesCommand)
