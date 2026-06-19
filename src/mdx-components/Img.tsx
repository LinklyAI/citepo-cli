import type { ComponentPropsWithoutRef } from 'react'

/**
 * Prepend the site basePath to a root-absolute image src so images resolve
 * when the blog is mounted under a sub path (e.g. `/blog`).
 *
 * Rules:
 * - External URLs (http/https/protocol-relative) and data URIs are left untouched.
 * - Only root-absolute paths ("/...") are prefixed. Relative paths in MDX have
 *   already been rewritten to "/.content-images/..." by the remark plugin before
 *   they reach this component, so they are root-absolute here too.
 * - Idempotent: a src already starting with the basePath is returned unchanged,
 *   so authors who hardcode "/blog/..." won't get a doubled prefix.
 */
export function withBasePath(src: string | undefined, basePath: string): string | undefined {
  if (!src) return src
  const prefix = basePath === '/' ? '' : basePath.replace(/\/+$/, '')
  if (!prefix) return src // root mount — nothing to add
  if (src.startsWith('//')) return src // protocol-relative URL (e.g. //cdn.example.com/x.png)
  if (!src.startsWith('/')) return src // relative path, data: URI, etc.
  if (src === prefix || src.startsWith(`${prefix}/`)) return src // already prefixed
  return `${prefix}${src}`
}

/**
 * Create an `img` MDX component bound to the blog's basePath.
 *
 * Registered as the lowercase `img` key in `<Content components={...} />`, so
 * both Markdown images (`![](...)`) and raw `<img>` tags in MDX get the basePath
 * prefix applied. This is what makes content images resolve under a sub path
 * mount; Astro's `base` config does NOT rewrite absolute URLs written inside
 * content.
 */
export function createImg(basePath: string) {
  return function Img({ src, alt = '', ...rest }: ComponentPropsWithoutRef<'img'>) {
    return <img src={withBasePath(src, basePath)} alt={alt} {...rest} />
  }
}
