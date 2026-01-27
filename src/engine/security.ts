import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface SecurityIssue {
  file: string
  line: number
  message: string
  severity: 'warning' | 'error'
}

export interface ScanResult {
  issues: SecurityIssue[]
  hasErrors: boolean
}

/**
 * Scan MDX content string for security issues.
 * Pure function — no file I/O, suitable for unit testing.
 * Checks for forbidden imports, exports, script tags, and event handler attributes.
 * Skips frontmatter blocks and fenced code blocks.
 */
export function scanMdxContent(content: string, fileName: string): SecurityIssue[] {
  const issues: SecurityIssue[] = []
  const lines = content.split('\n')

  let inFrontmatter = false
  let inCodeBlock = false
  let frontmatterCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const lineNum = i + 1

    // Track frontmatter boundaries (--- delimiters)
    if (line.trim() === '---') {
      frontmatterCount++
      if (frontmatterCount === 1) {
        inFrontmatter = true
        continue
      }
      if (frontmatterCount === 2) {
        inFrontmatter = false
        continue
      }
    }

    if (inFrontmatter) continue

    // Track fenced code block boundaries
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) continue

    // Detection rules
    if (/^\s*import\s/.test(line)) {
      issues.push({
        file: fileName,
        line: lineNum,
        message: 'Import statements are forbidden in MDX content',
        severity: 'error',
      })
    }

    if (/^\s*export\s/.test(line)) {
      issues.push({
        file: fileName,
        line: lineNum,
        message: 'Export statements are forbidden in MDX content',
        severity: 'error',
      })
    }

    if (/<script[\s>]/i.test(line)) {
      issues.push({
        file: fileName,
        line: lineNum,
        message: 'Script tags are forbidden in MDX content',
        severity: 'error',
      })
    }

    if (/\bon\w+\s*=/i.test(line)) {
      issues.push({
        file: fileName,
        line: lineNum,
        message: 'Event handler attributes are potentially unsafe',
        severity: 'warning',
      })
    }
  }

  return issues
}

/**
 * Scan all MDX files in the content directory for security issues.
 * Reads files from disk and delegates to scanMdxContent for analysis.
 */
export async function scanMdxSecurity(contentDir: string): Promise<ScanResult> {
  const allIssues: SecurityIssue[] = []

  const entries = await readdir(contentDir, { recursive: true })
  const mdxFiles = entries.filter((entry) => typeof entry === 'string' && entry.endsWith('.mdx'))

  for (const relativePath of mdxFiles) {
    const filePath = path.join(contentDir, relativePath)
    const content = await readFile(filePath, 'utf-8')
    const issues = scanMdxContent(content, relativePath)
    allIssues.push(...issues)
  }

  return {
    issues: allIssues,
    hasErrors: allIssues.some((issue) => issue.severity === 'error'),
  }
}
