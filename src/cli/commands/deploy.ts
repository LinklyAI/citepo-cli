import { Command } from 'commander'
import { CliError } from '../error.js'
import { mark, renderTable, style } from '../output.js'
import { action } from '../run.js'
import { api } from '../platform/client.js'
import {
  failureReason,
  gitHead,
  listDeploys,
  resolveSite,
  type PlatformDeploy,
} from '../platform/sites.js'

const FINISHED = new Set(['success', 'failed', 'canceled'])
const POLL_MS = 5000
/** A push shows up as a deploy within seconds; after this, something is off. */
const APPEAR_TIMEOUT_MS = 120_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function summary(d: PlatformDeploy): string {
  return d.commitMessage?.split('\n')[0] ?? d.commitSha?.slice(0, 7) ?? d.id
}

function renderEvents(d: PlatformDeploy): string {
  const rows = d.events.map((e) => [e.ts, e.stage, e.status, e.message ?? ''])
  return [
    '',
    `  ${style.bold(summary(d))}  ${d.status}  ${style.dim(d.id)}`,
    '',
    rows.length > 0
      ? renderTable(['Time', 'Stage', 'Status', 'Message'], rows)
      : '  No events yet.',
    '',
  ].join('\n')
}

const listCommand = new Command('list')
  .description('Recent deploys of a site')
  .option('--site <slug>', 'site (defaults to the one connected to this folder)')
  .option('--limit <n>', 'how many', '10')
  .action(
    action(async (_ctx, flags: { site?: string; limit: string }) => {
      const site = await resolveSite(flags.site)
      const limit = Math.min(50, Math.max(1, Number(flags.limit) || 10))
      const deploys = await listDeploys(site, limit)
      return {
        data: {
          site: site.slug,
          deploys: deploys.map(({ events: _events, ...d }) => ({
            ...d,
            error: failureReason({ ...d, events: _events }),
          })),
        },
        render: () =>
          deploys.length === 0
            ? '\n  No deploys yet.\n'
            : `\n${renderTable(
                ['Created', 'Status', 'Commit', 'Id'],
                deploys.map((d) => [d.createdAt, d.status, summary(d), style.dim(d.id)]),
              )}\n`,
      }
    }),
  )

const logsCommand = new Command('logs')
  .description('Build stages and errors of a deploy (the latest by default)')
  .argument('[deployId]', 'deploy id from `citepo deploy list`')
  .option('--site <slug>', 'site (defaults to the one connected to this folder)')
  .action(
    action(async (_ctx, deployId: string | undefined, flags: { site?: string }) => {
      const site = await resolveSite(flags.site)
      const deploys = await listDeploys(site, 50)
      const deploy = deployId ? deploys.find((d) => d.id === deployId) : deploys[0]
      if (!deploy) {
        throw new CliError({
          code: 'deploy_not_found',
          message: deployId ? `No deploy ${deployId} among the last 50` : 'No deploys yet',
          hint: 'Run `citepo deploy list`.',
        })
      }
      return {
        data: { ...deploy, error: failureReason(deploy) },
        render: () => renderEvents(deploy),
      }
    }),
  )

const startCommand = new Command('start')
  .description('Build and publish the latest commit again')
  .option('--site <slug>', 'site (defaults to the one connected to this folder)')
  .action(
    action(async (_ctx, flags: { site?: string }) => {
      const site = await resolveSite(flags.site)
      await api('POST', `/api/sites/${encodeURIComponent(site.id)}/deploy`)
      return {
        data: { site: site.slug, next: 'citepo deploy wait' },
        render: () =>
          `\n  ${mark.ok()} Deploy started. Run ${style.cyan('citepo deploy wait')} to follow it.\n`,
      }
    }),
  )

const waitCommand = new Command('wait')
  .description('Wait until the deploy of the current commit is live or has failed')
  .option('--site <slug>', 'site (defaults to the one connected to this folder)')
  .option(
    '--commit <sha>',
    'commit to wait for (defaults to HEAD of this folder; "any" for the latest deploy)',
  )
  .option('--timeout <seconds>', 'give up after this long', '600')
  .action(
    action(async (ctx, flags: { site?: string; commit?: string; timeout: string }) => {
      const site = await resolveSite(flags.site)
      const timeoutMs = Math.max(10, Number(flags.timeout) || 600) * 1000
      const commit =
        flags.commit === 'any' ? null : (flags.commit ?? (await gitHead(process.cwd())))
      const started = Date.now()
      let lastStatus = ''

      for (;;) {
        const deploys = await listDeploys(site, 5)
        const deploy = commit
          ? deploys.find(
              (d) => d.commitSha?.startsWith(commit) || commit.startsWith(d.commitSha ?? '-'),
            )
          : deploys[0]

        if (deploy && deploy.status !== lastStatus && !ctx.json) {
          process.stderr.write(`  ${deploy.status}: ${summary(deploy)}\n`)
          lastStatus = deploy.status
        }
        if (deploy && FINISHED.has(deploy.status)) {
          if (deploy.status === 'success') {
            return {
              data: {
                status: 'success',
                url: site.url,
                deployId: deploy.id,
                commit: deploy.commitSha,
              },
              render: () => `\n  ${mark.ok()} Live at ${style.cyan(site.url)}\n`,
            }
          }
          throw new CliError({
            code: 'deploy_failed',
            message: `Deploy ${deploy.status}: ${failureReason(deploy) ?? 'no error message recorded'}`,
            hint: 'Run `citepo check` and `citepo build` locally to reproduce; `citepo deploy logs` shows every stage.',
          })
        }

        const elapsed = Date.now() - started
        if (!deploy && commit && elapsed > APPEAR_TIMEOUT_MS) {
          throw new CliError({
            code: 'deploy_not_found',
            message: `No deploy for commit ${commit.slice(0, 7)} yet`,
            hint: `Check that it is pushed to ${site.repo ? `${site.repo.fullName} (${site.repo.branch ?? 'main'})` : 'the connected repository'}: only pushes to that branch publish.`,
          })
        }
        if (elapsed > timeoutMs) {
          throw new CliError({
            code: 'deploy_timeout',
            message: `Still ${deploy?.status ?? 'waiting'} after ${Math.round(elapsed / 1000)}s`,
            hint: 'Run `citepo deploy wait` again; builds of large blogs take a few minutes.',
          })
        }
        await sleep(POLL_MS)
      }
    }),
  )

export const deployCommand = new Command('deploy')
  .description('Follow and restart deploys of a CitePo site (needs `citepo auth login`)')
  .addCommand(listCommand)
  .addCommand(logsCommand)
  .addCommand(waitCommand)
  .addCommand(startCommand)
