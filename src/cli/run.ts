import type { Command } from 'commander'
import { EXIT, toErrorDetails, type CliErrorDetails, type ExitCode } from './error.js'
import { mark, style } from './output.js'
import { getVersion } from './utils.js'
import { getUpdateInfo, refreshUpdateCache, type UpdateInfo } from './version-check.js'

export interface CommandContext {
  /** True when `--json` was passed: print one JSON document and nothing else on stdout. */
  json: boolean
}

export interface CommandOutcome<T> {
  /** The result; printed as `data` in JSON mode. */
  data: T
  /** Human rendering of the result. Omit when the command already printed its own output. */
  render?: (data: T) => string
  exitCode?: ExitCode
  /** Skip the "update available" notice (e.g. `upgrade` already handled it). */
  hideUpdateNotice?: boolean
}

/** The JSON document every command prints with `--json`. */
export type JsonEnvelope<T> =
  | { ok: true; data: T; update?: UpdateInfo }
  | { ok: false; error: CliErrorDetails; update?: UpdateInfo }

/** Render an error for people: message, location, expectation and the next step. */
export function renderError(error: CliErrorDetails): string {
  const lines = [`  ${mark.error()} ${style.bold(error.message)}`]
  if (error.file)
    lines.push(`    ${style.dim('at')} ${error.file}${error.line ? `:${error.line}` : ''}`)
  if (error.expected) lines.push(`    ${style.dim('expected')} ${error.expected}`)
  if (error.hint) lines.push(`    ${style.cyan('→')} ${error.hint}`)
  return lines.join('\n')
}

function renderUpdate(update: UpdateInfo): string {
  return `\n  ${mark.info()} Update available: ${update.current} → ${style.bold(update.latest)}. Run ${style.cyan(update.command)} to upgrade.\n`
}

async function currentUpdate(): Promise<UpdateInfo | undefined> {
  try {
    return getUpdateInfo(await getVersion()) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Wrap a command handler so every command shares the same output contract:
 * JSON envelope with `--json`, human rendering otherwise, structured errors without
 * stack traces, stable exit codes, and an update notice (stderr, or the `update` field).
 */
export function action<A extends unknown[], T>(
  handler: (ctx: CommandContext, ...args: A) => Promise<CommandOutcome<T>>,
): (...args: A) => Promise<void> {
  return async function (this: Command, ...args: A) {
    const json = Boolean(this.optsWithGlobals<{ json?: boolean }>().json)
    // Refresh the version cache in the background; the notice comes from the cache
    const refresh = refreshUpdateCache()

    let exitCode: ExitCode = EXIT.ok
    try {
      const outcome = await handler({ json }, ...args)
      exitCode = outcome.exitCode ?? EXIT.ok
      const update = outcome.hideUpdateNotice ? undefined : await currentUpdate()
      if (json) {
        printJson({ ok: true, data: outcome.data, ...(update ? { update } : {}) })
      } else {
        if (outcome.render) console.log(outcome.render(outcome.data))
        if (update) process.stderr.write(renderUpdate(update))
      }
    } catch (err) {
      exitCode = EXIT.error
      const error = toErrorDetails(err)
      const update = await currentUpdate()
      if (json) {
        printJson({ ok: false, error, ...(update ? { update } : {}) })
      } else {
        console.error(`\n${renderError(error)}\n`)
        if (update) process.stderr.write(renderUpdate(update))
      }
    }

    await refresh
    process.exitCode = exitCode
  }
}

export function printJson<T>(envelope: JsonEnvelope<T>): void {
  process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
}
