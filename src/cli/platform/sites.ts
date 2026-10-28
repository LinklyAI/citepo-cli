import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { CliError } from '../error.js'
import { api } from './client.js'
import { loadCredentials, apiUrl } from './credentials.js'

const execFileAsync = promisify(execFile)

/** A site as GET /api/sites returns it. */
export interface PlatformSite {
  id: string
  name: string
  slug: string
  url: string
  basePath: string
  repo: { fullName: string; branch: string | null } | null
  activeDeployId: string | null
  latestDeploy: {
    id: string
    status: string
    commitSha: string | null
    commitMessage: string | null
    createdAt: string
    endedAt: string | null
  } | null
}

export interface DeployEvent {
  ts: string
  stage: string
  status: string
  message: string | null
}

export interface PlatformDeploy {
  id: string
  status: 'queued' | 'building' | 'success' | 'failed' | 'canceled' | string
  commitSha: string | null
  commitMessage: string | null
  branch: string | null
  createdAt: string
  startedAt: string | null
  endedAt: string | null
  events: DeployEvent[]
}

export async function listSites(): Promise<PlatformSite[]> {
  return (await api<{ sites: PlatformSite[] }>('GET', '/api/sites')).sites
}

/** "owner/name" of the GitHub remote `origin` in `dir`, or null. */
export async function gitHubRepoOf(dir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', dir, 'remote', 'get-url', 'origin'], {
      timeout: 5000,
    })
    const match = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/.exec(stdout.trim())
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function gitHead(dir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
      timeout: 5000,
    })
    return stdout.trim() || null
  } catch {
    return null
  }
}

/**
 * The site a command is about: `--site <slug>` if given, else the site connected to this
 * folder's GitHub repository, else the only site of the account.
 */
export async function resolveSite(
  siteFlag: string | undefined,
  dir = process.cwd(),
): Promise<PlatformSite> {
  const sites = await listSites()
  if (siteFlag) {
    const site = sites.find((s) => s.slug === siteFlag || s.id === siteFlag)
    if (site) return site
    throw new CliError({
      code: 'site_not_found',
      message: `No site "${siteFlag}" in this CitePo account`,
      expected: sites.map((s) => s.slug).join(' | ') || 'a site slug',
      hint: 'Create one with `citepo site create --name "My Blog" --slug my-blog`.',
    })
  }

  const repo = await gitHubRepoOf(dir)
  const byRepo = repo
    ? sites.find((s) => s.repo?.fullName.toLowerCase() === repo.toLowerCase())
    : undefined
  if (byRepo) return byRepo
  if (sites.length === 1) return sites[0]!

  throw new CliError({
    code: sites.length === 0 ? 'no_sites' : 'site_required',
    message:
      sites.length === 0 ? 'This CitePo account has no sites yet' : 'Several sites; say which one',
    ...(sites.length > 0 ? { expected: sites.map((s) => s.slug).join(' | ') } : {}),
    hint:
      sites.length === 0
        ? 'Create one with `citepo site create --name "My Blog" --slug my-blog`.'
        : 'Pass --site <slug>.',
  })
}

/** Dashboard page of a site's settings (connect repository, domains). */
export async function siteSettingsUrl(site: Pick<PlatformSite, 'id'>): Promise<string> {
  const base = (await loadCredentials())?.apiUrl ?? apiUrl()
  return `${base}/dashboard/site/${site.id}/settings`
}

export async function listDeploys(site: PlatformSite, limit: number): Promise<PlatformDeploy[]> {
  const data = await api<{ deploys: PlatformDeploy[] }>(
    'GET',
    `/api/sites/${encodeURIComponent(site.id)}/deploys?limit=${limit}`,
  )
  return data.deploys
}

/** A failed deploy's reason: the message of its failed stage. */
export function failureReason(deploy: PlatformDeploy): string | null {
  const failed = [...deploy.events].reverse().find((e) => e.status === 'failed' && e.message)
  return failed?.message ?? null
}
