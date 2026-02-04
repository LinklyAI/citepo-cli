import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRemarkRelativeImagesPlugin } from './remark-relative-images.js'

type MdastNode = {
  type: string
  url?: string
  children?: MdastNode[]
}

type MdastRoot = {
  type: string
  children?: MdastNode[]
}

type VFile = {
  path?: string
  history?: string[]
}

describe('createRemarkRelativeImagesPlugin', () => {
  let tempDir: string
  let contentDir: string
  let assetDir: string

  beforeEach(() => {
    // Create a temporary directory structure for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'remark-test-'))
    contentDir = path.join(tempDir, 'content')
    assetDir = path.join(tempDir, 'asset')

    fs.mkdirSync(contentDir, { recursive: true })
    fs.mkdirSync(assetDir, { recursive: true })
    fs.mkdirSync(path.join(contentDir, 'en'), { recursive: true })
    fs.mkdirSync(path.join(contentDir, 'en/images'), { recursive: true })
  })

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  function createPlugin() {
    return createRemarkRelativeImagesPlugin({ contentDir, assetDir })
  }

  function runPlugin(tree: MdastRoot, filePath: string) {
    const plugin = createPlugin()
    const transformer = plugin()
    const vfile: VFile = { path: filePath }
    transformer(tree, vfile)
    return tree
  }

  it('should skip external URLs (http/https)', () => {
    const tree: MdastRoot = {
      type: 'root',
      children: [
        { type: 'image', url: 'https://example.com/image.png' },
        { type: 'image', url: 'http://example.com/image.png' },
        { type: 'image', url: '//example.com/image.png' },
      ],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    expect(tree.children?.[0]?.url).toBe('https://example.com/image.png')
    expect(tree.children?.[1]?.url).toBe('http://example.com/image.png')
    expect(tree.children?.[2]?.url).toBe('//example.com/image.png')
  })

  it('should skip absolute paths', () => {
    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: '/images/absolute.png' }],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    expect(tree.children?.[0]?.url).toBe('/images/absolute.png')
  })

  it('should skip images using the images/ alias', () => {
    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: 'images/alias-image.png' }],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    expect(tree.children?.[0]?.url).toBe('images/alias-image.png')
  })

  it('should skip non-image files', () => {
    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: './document.pdf' }],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    expect(tree.children?.[0]?.url).toBe('./document.pdf')
  })

  it('should rewrite relative image paths and copy files', () => {
    // Create a test image
    const imagePath = path.join(contentDir, 'en/images/local.png')
    fs.writeFileSync(imagePath, 'fake png content')

    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: './images/local.png' }],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    // Check URL was rewritten
    const newUrl = tree.children?.[0]?.url
    expect(newUrl).toMatch(/^\/_content-images\/[a-f0-9]+\.png$/)

    // Check file was copied
    const contentImagesDir = path.join(assetDir, '_content-images')
    expect(fs.existsSync(contentImagesDir)).toBe(true)

    const files = fs.readdirSync(contentImagesDir)
    expect(files.length).toBe(1)
    expect(files[0]).toMatch(/^[a-f0-9]+\.png$/)
  })

  it('should handle images in sibling directories', () => {
    // Create a test image in a sibling directory
    fs.mkdirSync(path.join(contentDir, 'shared'), { recursive: true })
    const imagePath = path.join(contentDir, 'shared/common.png')
    fs.writeFileSync(imagePath, 'shared png content')

    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: '../shared/common.png' }],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    // Check URL was rewritten
    const newUrl = tree.children?.[0]?.url
    expect(newUrl).toMatch(/^\/_content-images\/[a-f0-9]+\.png$/)
  })

  it('should warn when image does not exist', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: './nonexistent.png' }],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    // URL should remain unchanged
    expect(tree.children?.[0]?.url).toBe('./nonexistent.png')

    // Warning should be logged
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('Image not found'),
    )

    consoleWarn.mockRestore()
  })

  it('should reject path traversal attacks', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Create a file outside project directory but still in filesystem
    // We create it at a sibling of tempDir's parent to simulate escaping
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'))
    const outsidePath = path.join(outsideDir, 'outside-image.png')
    fs.writeFileSync(outsidePath, 'outside content')

    // Calculate the relative path from contentDir/en to the outside file
    const mdxDir = path.join(contentDir, 'en')
    const relativePath = path.relative(mdxDir, outsidePath)

    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: relativePath }],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    // URL should remain unchanged
    expect(tree.children?.[0]?.url).toBe(relativePath)

    // Error should be logged (path is outside project root)
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Path traversal detected'),
    )

    consoleError.mockRestore()
    fs.rmSync(outsideDir, { recursive: true, force: true })
  })

  it('should use content-based hash for deduplication', () => {
    // Create the same image in two different locations
    fs.mkdirSync(path.join(contentDir, 'en/dir1'), { recursive: true })
    fs.mkdirSync(path.join(contentDir, 'en/dir2'), { recursive: true })

    const imageContent = 'same content'
    fs.writeFileSync(path.join(contentDir, 'en/dir1/image.png'), imageContent)
    fs.writeFileSync(path.join(contentDir, 'en/dir2/image.png'), imageContent)

    const tree: MdastRoot = {
      type: 'root',
      children: [
        { type: 'image', url: './dir1/image.png' },
        { type: 'image', url: './dir2/image.png' },
      ],
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    // Both should get the same hashed URL since content is identical
    expect(tree.children?.[0]?.url).toBe(tree.children?.[1]?.url)

    // Only one file should be in the output directory
    const contentImagesDir = path.join(assetDir, '_content-images')
    const files = fs.readdirSync(contentImagesDir)
    expect(files.length).toBe(1)
  })

  it('should support all common image formats', () => {
    const formats = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico']

    for (const ext of formats) {
      const imagePath = path.join(contentDir, `en/test${ext}`)
      fs.writeFileSync(imagePath, `content for ${ext}`)
    }

    const tree: MdastRoot = {
      type: 'root',
      children: formats.map((ext) => ({ type: 'image', url: `./test${ext}` })),
    }

    const mdxPath = path.join(contentDir, 'en/test.mdx')
    runPlugin(tree, mdxPath)

    // All images should be rewritten
    for (const node of tree.children ?? []) {
      expect(node.url).toMatch(/^\/_content-images\/[a-f0-9]+\.\w+$/)
    }
  })

  it('should handle empty vfile path gracefully', () => {
    const tree: MdastRoot = {
      type: 'root',
      children: [{ type: 'image', url: './images/test.png' }],
    }

    const plugin = createPlugin()
    const transformer = plugin()
    const vfile: VFile = {}
    transformer(tree, vfile)

    // URL should remain unchanged since we can't resolve the path
    expect(tree.children?.[0]?.url).toBe('./images/test.png')
  })
})
