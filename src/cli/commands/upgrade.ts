import { execFile, spawn } from 'node:child_process'
import { Command } from 'commander'
import { CliError } from '../error.js'
import { detectInstallMethod, globalInstallCommand } from '../install-method.js'
import { mark, style } from '../output.js'
import { action } from '../run.js'
import { getVersion } from '../utils.js'
import { fetchLatestVersion, isNewerVersion, writeUpdateCache } from '../version-check.js'

export interface UpgradeResult {
  current: string
  latest: string
  updateAvailable: boolean
  upgraded: boolean
  /** The command that was (or would be) run. */
  command?: string
}

/**
 * Run a command. Quiet mode keeps stdout clean for --json and collects stderr, so a
 * failure can say why (e.g. EACCES on a global npm prefix).
 */
function run(command: string[], quiet: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command
    // Windows package managers are .cmd shims and need a shell
    const child = spawn(bin!, args, {
      stdio: quiet ? ['ignore', 'ignore', 'pipe'] : 'inherit',
      shell: process.platform === 'win32',
    })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-2000)
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) return resolve()
      const tail = stderr.trim().split('\n').slice(-5).join('\n')
      reject(new Error(`exit code ${code}${tail ? `: ${tail}` : ''}`))
    })
  })
}

/** The version the `citepo` on PATH reports, or null when it cannot be run. */
function versionOnPath(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      'citepo',
      ['--version'],
      { timeout: 15_000, shell: process.platform === 'win32' },
      (err, stdout) => resolve(err ? null : stdout.trim() || null),
    )
  })
}

/** A next step for a failed install, from the package manager's error output. */
export function installFailureHint(message: string, command: string): string {
  if (/ERR_PNPM_GLOBAL_BIN_DIR_NOT_IN_PATH|ERR_PNPM_NO_GLOBAL_BIN_DIR/.test(message)) {
    return `pnpm's global bin folder is not on PATH. Run \`pnpm setup\`, open a new terminal, then run \`citepo upgrade\` again.`
  }
  if (/EACCES|permission denied/i.test(message)) {
    return `No permission to write the global packages folder. Run it with the rights it needs (e.g. sudo ${command}), or install Node.js with a version manager.`
  }
  return `Run it yourself: ${command}`
}

export const upgradeCommand = new Command('upgrade')
  .description('Upgrade citepo to the latest version')
  .option('--check', 'only report whether a newer version exists')
  .action(
    action(async (ctx, flags: { check?: boolean }) => {
      const current = await getVersion()
      const latest = await fetchLatestVersion()
      if (!latest) {
        throw new CliError({
          code: 'network_error',
          message: 'Could not reach the npm registry',
          hint: 'Check the network connection and try again.',
        })
      }
      await writeUpdateCache(latest)

      const method = detectInstallMethod()
      const command =
        method.kind === 'global'
          ? globalInstallCommand(method.manager, latest).join(' ')
          : undefined
      const updateAvailable = isNewerVersion(current, latest)
      const result: UpgradeResult = { current, latest, updateAvailable, upgraded: false, command }
      const render = (r: UpgradeResult) =>
        r.upgraded
          ? `\n  ${mark.ok()} Upgraded citepo ${r.current} → ${style.bold(r.latest)}\n`
          : `\n  ${mark.ok()} citepo ${r.current} is the latest version\n`

      if (!updateAvailable) return { data: result, render, hideUpdateNotice: true }
      if (flags.check) {
        return {
          data: result,
          hideUpdateNotice: true,
          render: (r: UpgradeResult) =>
            `\n  ${mark.info()} citepo ${r.latest} is available (installed: ${r.current}). Run ${style.cyan('citepo upgrade')}.\n`,
        }
      }

      if (method.kind !== 'global') {
        const hints = {
          npx: 'You are running citepo through npx; use `npx citepo@latest` to get the newest version.',
          project:
            'citepo is a dependency of this project; update it there, e.g. `npm install citepo@latest`.',
          source:
            'citepo runs from a source checkout; pull and rebuild it, or install it with `npm install -g citepo`.',
        }
        throw new CliError({
          code: 'upgrade_unsupported',
          message: `citepo ${latest} is available, but this installation cannot upgrade itself`,
          hint: hints[method.kind],
        })
      }

      if (!ctx.json)
        console.log(`\n  Upgrading citepo ${current} → ${latest} with ${style.cyan(command!)}\n`)
      try {
        await run(globalInstallCommand(method.manager, latest), ctx.json)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new CliError({
          code: 'upgrade_failed',
          message: `${command} failed: ${message}`,
          hint: installFailureHint(message, command!),
        })
      }
      // Trust the result, not the exit code: another copy earlier on PATH would still run
      const installed = await versionOnPath()
      if (installed !== latest) {
        throw new CliError({
          code: 'upgrade_incomplete',
          message: `${command} finished, but \`citepo --version\` reports ${installed ?? 'nothing'} instead of ${latest}`,
          hint:
            process.platform === 'win32'
              ? 'Another citepo comes first on PATH: run `where citepo`, remove the old copy, then open a new terminal.'
              : 'Another citepo comes first on PATH: run `which -a citepo`, remove the old copy or fix PATH, then open a new terminal.',
        })
      }
      // The new version's skill files ship with the new package: let it refresh the copies
      await run(['citepo', 'skill', 'update'], true).catch(() => undefined)
      // This process is still the old version: the update notice would be stale
      return { data: { ...result, upgraded: true }, render, hideUpdateNotice: true }
    }),
  )
