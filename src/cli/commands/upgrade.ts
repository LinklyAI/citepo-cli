import { spawn } from 'node:child_process'
import { Command } from 'commander'
import { CliError } from '../error.js'
import { detectInstallMethod } from '../install-method.js'
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
      const command = method.kind === 'global' ? method.command.join(' ') : undefined
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
        await run(method.command, ctx.json)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new CliError({
          code: 'upgrade_failed',
          message: `${command} failed: ${message}`,
          hint: /EACCES|permission denied/i.test(message)
            ? `No permission to write the global packages folder. Run it with the rights it needs (e.g. sudo ${command}), or install Node.js with a version manager.`
            : `Run it yourself: ${command}`,
        })
      }
      // The new version's skill files ship with the new package: let it refresh the copies
      await run(['citepo', 'skill', 'update'], true).catch(() => undefined)
      // This process is still the old version: the update notice would be stale
      return { data: { ...result, upgraded: true }, render, hideUpdateNotice: true }
    }),
  )
