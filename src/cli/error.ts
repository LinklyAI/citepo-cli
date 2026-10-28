import { ZodError } from 'zod'

/** Exit codes shared by every command. */
export const EXIT = {
  ok: 0,
  error: 1,
  /** The command ran, but reported warnings only (e.g. `citepo check`). */
  warnings: 2,
} as const

export type ExitCode = (typeof EXIT)[keyof typeof EXIT]

export interface CliErrorDetails {
  /** Stable machine-readable code, e.g. "config_not_found". */
  code: string
  message: string
  /** What to do next, ideally the exact command to run. */
  hint?: string
  file?: string
  line?: number
  /** The expected value or format, when the input was wrong. */
  expected?: string
}

/** An error meant for the user: printed without a stack trace, with a code and a hint. */
export class CliError extends Error {
  readonly details: CliErrorDetails

  constructor(details: CliErrorDetails) {
    super(details.message)
    this.name = 'CliError'
    this.details = details
  }
}

const NOT_A_BLOG_HINT =
  'Run this inside a CitePo blog directory, or create one with `citepo init <dir>`.'

/** Turn any thrown value into structured error details. */
export function toErrorDetails(err: unknown): CliErrorDetails {
  if (err instanceof CliError) return err.details

  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
      return `${path}: ${issue.message}`
    })
    return {
      code: 'config_invalid',
      message: `blog.json validation failed: ${issues.join('; ')}`,
      file: 'blog.json',
      hint: 'Fix the fields above. Run `citepo docs config` to see every field.',
    }
  }

  if (err instanceof SyntaxError) {
    return {
      code: 'config_invalid_json',
      message: 'blog.json is not valid JSON',
      file: 'blog.json',
    }
  }

  if (err instanceof Error) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT' && nodeErr.path?.endsWith('blog.json')) {
      return { code: 'config_not_found', message: 'blog.json not found', hint: NOT_A_BLOG_HINT }
    }
    return { code: 'unexpected_error', message: err.message }
  }

  return { code: 'unexpected_error', message: String(err) }
}
