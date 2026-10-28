import { spawn } from 'node:child_process'
import path from 'node:path'
import { Command } from 'commander'
import { loadBlogConfig } from '../../engine/config.js'
import { CliError } from '../error.js'
import { mark, renderTable, style } from '../output.js'
import { action } from '../run.js'
import { api } from '../platform/client.js'
import {
  gitHubRepoOf,
  listSites,
  resolveSite,
  siteSettingsUrl,
  type PlatformSite,
} from '../platform/sites.js'
import { toKebabCase } from './init.js'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{4,}[a-z0-9]$/

function renderSite(site: PlatformSite): string {
  const deploy = site.latestDeploy
  return [
    '',
    `  ${style.bold(site.name)}  ${style.cyan(site.url)}`,
    `  ${style.dim('Slug')}        ${site.slug}`,
    `  ${style.dim('Repository')}  ${site.repo ? `${site.repo.fullName} (${site.repo.branch ?? 'main'})` : style.yellow('not connected')}`,
    `  ${style.dim('Last deploy')} ${deploy ? `${deploy.status} · ${deploy.commitMessage?.split('\n')[0] ?? deploy.id} · ${deploy.createdAt}` : 'none yet'}`,
    '',
  ].join('\n')
}

const listCommand = new Command('list').description('List the sites in your CitePo account').action(
  action(async () => {
    const sites = await listSites()
    return {
      data: { sites },
      render: () =>
        sites.length === 0
          ? `\n  No sites yet. Create one with ${style.cyan('citepo site create')}.\n`
          : `\n${renderTable(
              ['Slug', 'URL', 'Repository', 'Last deploy'],
              sites.map((s) => [
                s.slug,
                s.url,
                s.repo?.fullName ?? '-',
                s.latestDeploy?.status ?? '-',
              ]),
            )}\n`,
    }
  }),
)

const createCommand = new Command('create')
  .description('Create a CitePo site (address <slug>.citepo.app)')
  .option('--name <name>', 'site name (defaults to the name in blog.json)')
  .option('--slug <slug>', 'subdomain: 6+ lowercase letters, numbers or hyphens')
  .action(
    action(async (_ctx, flags: { name?: string; slug?: string }) => {
      let name = flags.name
      if (!name) {
        try {
          name = (await loadBlogConfig(process.cwd())).name
        } catch {
          throw new CliError({
            code: 'missing_option',
            message: 'A site name is required',
            hint: 'Pass --name "My Blog".',
          })
        }
      }
      const slug = flags.slug ?? toKebabCase(name) ?? toKebabCase(path.basename(process.cwd()))
      if (!slug || !SLUG_PATTERN.test(slug)) {
        throw new CliError({
          code: 'invalid_slug',
          message: slug ? `Invalid slug "${slug}"` : 'A slug is required',
          expected:
            '6 or more lowercase letters, numbers or hyphens, not starting or ending with a hyphen',
          hint: 'Example: citepo site create --name "My Blog" --slug my-blog',
        })
      }

      const created = await api<{
        site: { id: string; name: string; slug: string; defaultDomain: string | null }
      }>('POST', '/api/sites', { name, slug })
      const site = created.site
      const url = `https://${site.defaultDomain ?? `${site.slug}.citepo.app`}`
      const data = {
        id: site.id,
        name: site.name,
        slug: site.slug,
        url,
        next: 'citepo site connect',
      }
      return {
        data,
        render: () =>
          `\n  ${mark.ok()} Created ${style.bold(site.name)} at ${style.cyan(url)}\n  Next: push the blog to GitHub, then run ${style.cyan('citepo site connect')}.\n`,
      }
    }),
  )

const connectCommand = new Command('connect')
  .description('Connect the GitHub repository to a site; every push then publishes the blog')
  .option('--site <slug>', 'site to connect (defaults to the only site)')
  .option('--repo <owner/name>', 'GitHub repository (defaults to the git remote origin)')
  .action(
    action(async (_ctx, flags: { site?: string; repo?: string }) => {
      const repo = flags.repo ?? (await gitHubRepoOf(process.cwd()))
      if (!repo) {
        throw new CliError({
          code: 'missing_option',
          message: 'No GitHub repository given and no GitHub remote "origin" in this folder',
          hint: 'Push the blog to GitHub first, or pass --repo owner/name.',
        })
      }
      const site = await resolveSite(flags.site)
      try {
        const result = await api<{ deployTriggered: boolean }>(
          'POST',
          `/api/sites/${encodeURIComponent(site.id)}/repo`,
          { repoFullName: repo },
        )
        const data = {
          site: site.slug,
          repo,
          url: site.url,
          deployTriggered: result.deployTriggered,
          next: 'citepo deploy wait',
        }
        return {
          data,
          render: () =>
            `\n  ${mark.ok()} Connected ${style.bold(repo)} to ${site.slug}. The first build has started.\n  Run ${style.cyan('citepo deploy wait')} to follow it.\n`,
        }
      } catch (err) {
        // These two need the person's browser once; give the exact page
        if (
          err instanceof CliError &&
          ['github_not_linked', 'app_not_installed'].includes(err.details.code)
        ) {
          const settings = await siteSettingsUrl(site)
          throw new CliError({
            ...err.details,
            hint: `Open ${settings} in the browser, choose Connect repository and pick ${repo} (this links GitHub and installs the CitePo app once). Then run \`citepo site status\`; later repositories connect from the CLI.`,
          })
        }
        throw err
      }
    }),
  )

const statusCommand = new Command('status')
  .description('Show a site: address, repository and last deploy')
  .option('--site <slug>', 'site (defaults to the one connected to this folder)')
  .action(
    action(async (_ctx, flags: { site?: string }) => {
      const site = await resolveSite(flags.site)
      return { data: site, render: renderSite }
    }),
  )

const openCommand = new Command('open')
  .description('Print (and open in a local browser) the site or its settings page')
  .option('--site <slug>', 'site (defaults to the one connected to this folder)')
  .option('--settings', 'the dashboard settings page instead of the site')
  .action(
    action(async (ctx, flags: { site?: string; settings?: boolean }) => {
      const site = await resolveSite(flags.site)
      const url = flags.settings ? await siteSettingsUrl(site) : site.url
      if (!ctx.json && process.stdout.isTTY && !process.env.SSH_CONNECTION) {
        const command =
          process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
        const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
        spawn(command, args, { stdio: 'ignore', detached: true })
          .on('error', () => undefined)
          .unref()
      }
      return { data: { url }, render: () => `\n  ${url}\n` }
    }),
  )

export const siteCommand = new Command('site')
  .description('Create and connect CitePo sites (needs `citepo auth login`)')
  .addCommand(listCommand)
  .addCommand(createCommand)
  .addCommand(connectCommand)
  .addCommand(statusCommand)
  .addCommand(openCommand)
