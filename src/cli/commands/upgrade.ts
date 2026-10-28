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
  upgraded: boolean
  /** The command that was (or would be) run. */
  command?: string
}

function run(command: string[], quiet: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const [bin, ...args] = command
    // Windows package managers are .cmd shims and need a shell
    const child = spawn(bin!, args, {
      stdio: quiet ? 'ignore' : 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`exit code ${code}`))))
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
      const result: UpgradeResult = { current, latest, upgraded: false, command }
      const render = (r: UpgradeResult) =>
        r.upgraded
          ? `\n  ${mark.ok()} Upgraded citepo ${r.current} → ${style.bold(r.latest)}\n`
          : `\n  ${mark.ok()} citepo ${r.current} is the latest version\n`

      if (!isNewerVersion(current, latest)) return { data: result, render }
      if (flags.check) {
        return {
          data: result,
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
        throw new CliError({
          code: 'upgrade_failed',
          message: `${command} failed: ${err instanceof Error ? err.message : String(err)}`,
          hint: `Run it yourself: ${command}`,
        })
      }
      return { data: { ...result, upgraded: true }, render }
    }),
  )
