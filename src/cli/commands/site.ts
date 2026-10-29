import path from 'node:path'
import { Command } from 'commander'
import { loadBlogConfig } from '../../engine/config.js'
import { CliError } from '../error.js'
import { mark, renderTable, style } from '../output.js'
import { action } from '../run.js'
import { api, platformHint } from '../platform/client.js'
import { openBrowser } from '../platform/browser.js'
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
  .option(
    '--site <slug>',
    'site to connect (defaults to the only site without a repository, or the only site)',
  )
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
      const site = await resolveSite(flags.site, process.cwd(), { unconnected: true })
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
      if (!ctx.json) openBrowser(url)
      return { data: { url }, render: () => `\n  ${url}\n` }
    }),
  )

interface PendingUrls {
  enabled: boolean
  urls: string[]
  nextSubmitAt: string | null
}

interface IndexNowSubmission {
  urlCount: number
  status: string
  responseCode: number | null
  errorMessage: string | null
}

/** What to do after IndexNow refused a submission, by its response code. */
function indexNowRejectionHint(responseCode: number | null): string {
  if (responseCode === 429)
    return 'Search engines are limiting submissions right now; run `citepo site index --submit` again in an hour.'
  if (responseCode === 403 || responseCode === 422)
    return 'IndexNow could not verify the key file; check that the site is deployed with IndexNow on, then retry.'
  return 'Run `citepo site index --submit` again later; the pending URLs keep waiting.'
}

const indexCommand = new Command('index')
  .description(
    'Pages search engines have not been told about yet (new, or updated since the last submission); --submit sends them via IndexNow to Bing, Yandex and Naver',
  )
  .option('--site <slug>', 'site (defaults to the one connected to this folder)')
  .option('--submit', 'submit the pending URLs (at most once per 10 minutes per site)')
  .action(
    action(async (_ctx, flags: { site?: string; submit?: boolean }) => {
      const site = await resolveSite(flags.site)
      const base = `/api/sites/${encodeURIComponent(site.id)}/search-index`
      const pending = await api<PendingUrls>('GET', `${base}/pending`)
      if (!pending.enabled) {
        throw new CliError({
          code: 'indexnow_disabled',
          message: `IndexNow is off for ${site.slug}`,
          hint: platformHint('indexnow_disabled'),
        })
      }

      if (!flags.submit || pending.urls.length === 0) {
        const count = pending.urls.length
        return {
          data: {
            site: site.slug,
            submitted: 0,
            pending: count,
            urls: pending.urls,
            nextSubmitAt: pending.nextSubmitAt,
            ...(count > 0 ? { next: 'citepo site index --submit' } : {}),
          },
          render: () =>
            count === 0
              ? `\n  ${mark.ok()} Every page in the sitemap has been submitted.\n`
              : `\n  ${count} page${count === 1 ? '' : 's'} not submitted yet:\n${pending.urls.map((u) => `    ${u}`).join('\n')}\n\n  Submit them with ${style.cyan('citepo site index --submit')}.\n`,
        }
      }

      if (pending.nextSubmitAt) {
        throw new CliError({
          code: 'submit_too_soon',
          message: `${site.slug} submitted less than 10 minutes ago; it can submit again after ${pending.nextSubmitAt}`,
          hint: platformHint('submit_too_soon'),
        })
      }
      const { submission } = await api<{ submission: IndexNowSubmission | null }>('POST', base, {})
      if (submission && submission.status !== 'success') {
        throw new CliError({
          code: 'indexnow_rejected',
          message: `IndexNow refused the submission (${submission.responseCode ?? 'no response'}): ${submission.errorMessage ?? 'no message'}`,
          hint: indexNowRejectionHint(submission.responseCode),
        })
      }
      const submitted = submission?.urlCount ?? 0
      return {
        data: {
          site: site.slug,
          submitted,
          pending: 0,
          urls: [] as string[],
          nextSubmitAt: null as string | null,
        },
        render: () =>
          `\n  ${mark.ok()} Submitted ${submitted} URL${submitted === 1 ? '' : 's'} to Bing, Yandex and Naver.\n`,
      }
    }),
  )

export const siteCommand = new Command('site')
  .description('Create and connect CitePo sites (needs `citepo auth login`)')
  .addCommand(listCommand)
  .addCommand(createCommand)
  .addCommand(connectCommand)
  .addCommand(statusCommand)
  .addCommand(openCommand)
  .addCommand(indexCommand)
