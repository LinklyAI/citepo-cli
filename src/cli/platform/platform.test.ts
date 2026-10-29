import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CliError } from '../error.js'
import { api } from './client.js'
import { loadCredentials, saveCredentials } from './credentials.js'
import {
  failureReason,
  resolveSite,
  servedDeployId,
  type PlatformDeploy,
  type PlatformSite,
} from './sites.js'

const site = (slug: string, repo: string | null): PlatformSite => ({
  id: `id-${slug}`,
  name: slug,
  slug,
  url: `https://${slug}.citepo.app`,
  basePath: '/',
  repo: repo ? { fullName: repo, branch: 'main' } : null,
  activeDeployId: null,
  latestDeploy: null,
})

function stubFetch(handler: (url: string, init?: RequestInit) => Response) {
  const mock = vi.fn(async (url: string | URL, init?: RequestInit) => handler(String(url), init))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('platform client', () => {
  let home: string
  const savedEnv = { ...process.env }

  beforeEach(async () => {
    home = await mkdtemp(path.join(tmpdir(), 'citepo-platform-'))
    process.env.CITEPO_HOME = home
    delete process.env.CITEPO_TOKEN
    delete process.env.CITEPO_API_URL
  })

  afterEach(async () => {
    process.env = { ...savedEnv }
    vi.unstubAllGlobals()
    await rm(home, { recursive: true, force: true })
  })

  it('stores credentials readable by the owner only; CITEPO_TOKEN wins', async () => {
    await saveCredentials({ token: 'ctp_file', email: 'a@b.c' })
    if (process.platform !== 'win32') {
      expect((await stat(path.join(home, 'credentials.json'))).mode & 0o777).toBe(0o600)
    }
    expect(await loadCredentials()).toMatchObject({
      token: 'ctp_file',
      source: 'file',
      apiUrl: 'https://citepo.com',
    })
    process.env.CITEPO_TOKEN = 'ctp_env'
    expect(await loadCredentials()).toMatchObject({ token: 'ctp_env', source: 'env' })
  })

  it('asks to sign in when there is no token', async () => {
    await expect(api('GET', '/api/sites')).rejects.toMatchObject({
      details: { code: 'not_logged_in' },
    })
  })

  it('sends the bearer token and maps platform error codes', async () => {
    await saveCredentials({ token: 'ctp_x', apiUrl: 'https://example.test' })
    const fetchMock = stubFetch(() =>
      Response.json({ error: 'App missing', code: 'app_not_installed' }, { status: 409 }),
    )
    const err = await api('POST', '/api/sites/1/repo', { repoFullName: 'a/b' }).catch(
      (e: unknown) => e,
    )
    expect(err).toBeInstanceOf(CliError)
    expect((err as CliError).details).toMatchObject({
      code: 'app_not_installed',
      hint: expect.stringContaining('GitHub App'),
    })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('https://example.test/api/sites/1/repo')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ctp_x')
  })

  it('turns 401 into not_logged_in', async () => {
    await saveCredentials({ token: 'ctp_x' })
    stubFetch(() => Response.json({ error: 'Invalid token' }, { status: 401 }))
    await expect(api('GET', '/api/sites')).rejects.toMatchObject({
      details: { code: 'not_logged_in' },
    })
  })

  it('resolves the site by flag, by the git remote of the folder, or the only site', async () => {
    await saveCredentials({ token: 'ctp_x' })
    stubFetch(() =>
      Response.json({ sites: [site('alpha-blog', 'me/alpha'), site('beta-blog', null)] }),
    )
    expect((await resolveSite('beta-blog')).slug).toBe('beta-blog')
    await expect(resolveSite('nope-blog')).rejects.toMatchObject({
      details: { code: 'site_not_found' },
    })
    // The temp dir has no git remote and there are two sites
    await expect(resolveSite(undefined, home)).rejects.toMatchObject({
      details: { code: 'site_required' },
    })

    stubFetch(() => Response.json({ sites: [site('alpha-blog', 'me/alpha')] }))
    expect((await resolveSite(undefined, home)).slug).toBe('alpha-blog')
  })

  it('lets `site connect` pick the only site without a repository', async () => {
    await saveCredentials({ token: 'ctp_x' })
    stubFetch(() =>
      Response.json({
        sites: [
          site('alpha-blog', 'me/alpha'),
          site('beta-blog', 'me/beta'),
          site('new-blog', null),
        ],
      }),
    )
    expect((await resolveSite(undefined, home, { unconnected: true })).slug).toBe('new-blog')

    stubFetch(() =>
      Response.json({
        sites: [site('alpha-blog', 'me/alpha'), site('one-blog', null), site('two-blog', null)],
      }),
    )
    await expect(resolveSite(undefined, home, { unconnected: true })).rejects.toMatchObject({
      details: { code: 'site_required' },
    })
  })

  it('reads the served deploy from a probe that is not a page', async () => {
    const fetchMock = stubFetch(
      () => new Response(null, { status: 404, headers: { 'X-Citepo-Deploy': 'dep-2' } }),
    )
    expect(await servedDeployId('https://me.example/blog/')).toBe('dep-2')
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      'https://me.example/blog/__citepo-deploy-probe',
    )

    stubFetch(() => new Response(null, { status: 302 }))
    expect(await servedDeployId('https://me.example')).toBeNull()
    stubFetch(() => {
      throw new TypeError('fetch failed')
    })
    expect(await servedDeployId('https://me.example')).toBeNull()
  })
})

describe('failureReason', () => {
  it('returns the message of the last failed stage', () => {
    const deploy = {
      events: [
        { ts: '1', stage: 'download', status: 'success', message: null },
        {
          ts: '2',
          stage: 'build',
          status: 'failed',
          message: 'build: BUILD_FAILED - bad frontmatter',
        },
      ],
    } as PlatformDeploy
    expect(failureReason(deploy)).toBe('build: BUILD_FAILED - bad frontmatter')
  })
})
