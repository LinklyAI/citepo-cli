import path from 'node:path'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

/**
 * Directory name for copied content images (relative to asset/).
 * Uses dot prefix to indicate it's a generated/hidden directory.
 */
export const CONTENT_IMAGES_DIR = '.content-images'

/**
 * URL path prefix for content images (must match CONTENT_IMAGES_DIR).
 */
export const CONTENT_IMAGES_URL_PREFIX = `/${CONTENT_IMAGES_DIR}/`

/**
 * Supported image file extensions
 */
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'])

/**
 * MDAST node types
 */
type MdastNode = {
  type: string
  url?: string
  children?: MdastNode[]
}

type MdastRoot = {
  type: string
  children?: MdastNode[]
}

/**
 * VFile-like object passed to remark plugins
 */
type VFile = {
  path?: string
  history?: string[]
}

/**
 * Walk through AST nodes recursively
 */
function walk(node: MdastNode | MdastRoot | undefined, visit: (node: MdastNode) => void) {
  if (!node || typeof node !== 'object') return

  if ('type' in node && typeof node.type === 'string') {
    visit(node as MdastNode)
  }

  const children = (node as MdastNode).children
  if (!children || !Array.isArray(children)) return

  for (const child of children) {
    walk(child, visit)
  }
}

/**
 * Check if a URL is an external link (http/https/protocol-relative)
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')
}

/**
 * Check if a URL is an absolute path
 */
function isAbsolutePath(url: string): boolean {
  return url.startsWith('/')
}

/**
 * Check if a URL uses the existing `images/` alias
 */
function isImagesAlias(url: string): boolean {
  return url.startsWith('images/')
}

/**
 * Check if a file extension is a supported image format
 */
function isSupportedImageExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

/**
 * Generate a content-based hash for a file
 */
function generateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return createHash('md5').update(content).digest('hex').slice(0, 12)
}

/**
 * Check if a path is within the allowed directory (prevent path traversal attacks)
 */
function isPathWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedPath = path.resolve(filePath)
  const resolvedDirectory = path.resolve(directory)
  return resolvedPath.startsWith(resolvedDirectory + path.sep) || resolvedPath === resolvedDirectory
}

export interface RemarkRelativeImagesOptions {
  /** User's content directory (where MDX files are located) */
  contentDir: string
  /** User's asset directory (where images will be copied to) */
  assetDir: string
}

export interface ResolveImageOptions {
  /** The image URL/path (may be relative, absolute, or external) */
  imageUrl: string
  /** Directory containing the source file (e.g., MDX file's directory) */
  sourceDir: string
  /** User's content directory (for security boundary check) */
  contentDir: string
  /** User's asset directory (where images will be copied to) */
  assetDir: string
}

// Shared cache for processed files across all callers
const globalCopiedFiles = new Map<string, string>()

/**
 * Resolve an image URL, copying relative images to .content-images if needed.
 * This function can be used by both remark plugin and frontmatter processing.
 *
 * @returns The resolved URL (may be unchanged for external/absolute URLs)
 */
export function resolveImageUrl(options: ResolveImageOptions): string {
  const { imageUrl, sourceDir, contentDir, assetDir } = options

  // Empty or undefined
  if (!imageUrl) return imageUrl

  // Skip external URLs
  if (isExternalUrl(imageUrl)) return imageUrl

  // Skip absolute paths (already handled by Astro)
  if (isAbsolutePath(imageUrl)) return imageUrl

  // images/ alias -> convert to absolute path /images/
  if (isImagesAlias(imageUrl)) return `/${imageUrl}`

  // Skip non-image files
  if (!isSupportedImageExtension(imageUrl)) return imageUrl

  const contentImagesDir = path.join(assetDir, CONTENT_IMAGES_DIR)

  // Resolve the relative path to absolute
  const absoluteImagePath = path.resolve(sourceDir, imageUrl)

  // Check cache
  const cachedPath = globalCopiedFiles.get(absoluteImagePath)
  if (cachedPath) return cachedPath

  // Check if the image exists
  if (!fs.existsSync(absoluteImagePath)) {
    console.warn(`[resolve-image] Warning: Image not found: ${imageUrl} (in ${sourceDir})`)
    return imageUrl
  }

  // Security check: ensure the image is within the user's project directory
  const projectRoot = path.dirname(contentDir)
  if (!isPathWithinDirectory(absoluteImagePath, projectRoot)) {
    console.error(`[resolve-image] Error: Path traversal detected. Image "${imageUrl}" resolves outside project.`)
    return imageUrl
  }

  // Generate unique filename based on content hash
  const ext = path.extname(absoluteImagePath)
  const hash = generateFileHash(absoluteImagePath)
  const newFileName = `${hash}${ext}`
  const destPath = path.join(contentImagesDir, newFileName)

  // Copy the file if it doesn't already exist
  try {
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(contentImagesDir, { recursive: true })
      fs.copyFileSync(absoluteImagePath, destPath)
    }

    const newUrl = `${CONTENT_IMAGES_URL_PREFIX}${newFileName}`
    globalCopiedFiles.set(absoluteImagePath, newUrl)
    return newUrl
  } catch (err) {
    console.error(
      `[resolve-image] Error copying image: ${absoluteImagePath}`,
      err instanceof Error ? err.message : err,
    )
    return imageUrl
  }
}

/**
 * Creates a remark plugin that handles relative image paths in MDX files.
 *
 * This plugin:
 * 1. Scans for image nodes with relative paths (e.g., `./images/foo.png`)
 * 2. Copies the images to `asset/${CONTENT_IMAGES_DIR}/` with content-based hashes
 * 3. Rewrites the image URLs to `${CONTENT_IMAGES_URL_PREFIX}{hash}{ext}`
 *
 * This allows users to reference images relative to their MDX files,
 * enabling local Markdown preview while still working with Astro's build system.
 */
export function createRemarkRelativeImagesPlugin(options: RemarkRelativeImagesOptions) {
  const { contentDir, assetDir } = options
  const contentImagesDir = path.join(assetDir, CONTENT_IMAGES_DIR)

  // Track copied files to avoid duplicate operations
  const copiedFiles = new Map<string, string>()

  return function remarkRelativeImagesPlugin() {
    return function transformer(tree: MdastRoot, file: VFile) {
      // Get the MDX file path from VFile
      const mdxFilePath = file.path ?? file.history?.[0]
      if (!mdxFilePath) {
        return
      }

      const mdxDir = path.dirname(mdxFilePath)

      walk(tree, (node) => {
        // Only process image nodes
        if (node.type !== 'image') return
        if (!node.url || typeof node.url !== 'string') return

        const imageUrl = node.url

        // Skip external URLs
        if (isExternalUrl(imageUrl)) return

        // Skip absolute paths (already handled by Astro)
        if (isAbsolutePath(imageUrl)) return

        // Skip images using the existing `images/` alias
        if (isImagesAlias(imageUrl)) return

        // Skip non-image files
        if (!isSupportedImageExtension(imageUrl)) return

        // Resolve the relative path to absolute
        const absoluteImagePath = path.resolve(mdxDir, imageUrl)

        // Check if we've already processed this file
        const cachedPath = copiedFiles.get(absoluteImagePath)
        if (cachedPath) {
          node.url = cachedPath
          return
        }

        // Check if the image exists
        if (!fs.existsSync(absoluteImagePath)) {
          console.warn(
            `[remark-relative-images] Warning: Image not found: ${imageUrl} (referenced from ${mdxFilePath})`,
          )
          return
        }

        // Security check: ensure the image is within the user's project directory
        // Allow images in content directory or its parent (for ../shared/ patterns)
        const projectRoot = path.dirname(contentDir)
        if (!isPathWithinDirectory(absoluteImagePath, projectRoot)) {
          console.error(
            `[remark-relative-images] Error: Path traversal detected. Image path "${imageUrl}" resolves outside project directory.`,
          )
          return
        }

        // Generate unique filename based on content hash
        const ext = path.extname(absoluteImagePath)
        const hash = generateFileHash(absoluteImagePath)
        const newFileName = `${hash}${ext}`
        const destPath = path.join(contentImagesDir, newFileName)

        // Copy the file if it doesn't already exist
        try {
          if (!fs.existsSync(destPath)) {
            // Ensure the target directory exists
            fs.mkdirSync(contentImagesDir, { recursive: true })
            fs.copyFileSync(absoluteImagePath, destPath)
          }

          // Rewrite the URL to use the new path
          const newUrl = `${CONTENT_IMAGES_URL_PREFIX}${newFileName}`
          node.url = newUrl
          copiedFiles.set(absoluteImagePath, newUrl)
        } catch (err) {
          console.error(
            `[remark-relative-images] Error copying image: ${absoluteImagePath}`,
            err instanceof Error ? err.message : err,
          )
        }
      })
    }
  }
}
