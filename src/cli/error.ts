import { ZodError } from 'zod'

/**
 * Format an error into a human-readable message.
 * Handles ZodError, SyntaxError, ENOENT, and generic errors.
 */
export function formatError(err: unknown): string {
  if (err instanceof ZodError) {
    const details = err.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
        return `  - ${path}: ${issue.message}`
      })
      .join('\n')
    return `blog.json validation failed:\n${details}`
  }

  if (err instanceof SyntaxError) {
    return 'blog.json is not valid JSON'
  }

  if (err instanceof Error) {
    // Node.js ENOENT error
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      return 'blog.json not found'
    }
    return err.message
  }

  return String(err)
}

/**
 * Handle a command error: format, print, and exit with code 1.
 * @param err - The caught error
 * @param context - A short description of what failed (e.g., "load blog config")
 */
export function handleCommandError(err: unknown, context: string): never {
  const message = formatError(err)
  console.error(`\n  Failed to ${context}\n  ${message}\n`)
  console.error('  Make sure you are in a CitePo blog directory (created with `citepo new`).\n')
  process.exit(1)
}
