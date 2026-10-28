import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { citepoHome } from './paths.js'

const REGISTRY_MIRRORS = [
  'https://registry.npmjs.org/citepo/latest',
  'https://registry.npmmirror.com/citepo/latest',
]

const TIMEOUT_MS = 3000
/** Check the registry at most once a day; the notice itself is read from the cache. */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export interface UpdateInfo {
  current: string
  latest: string
  command: string
}

interface UpdateCache {
  latest: string
  checkedAt: number
}

function cachePath(): string {
  return join(citepoHome(), 'update-check.json')
}

/** Update checks are skipped in CI and when CITEPO_NO_UPDATE_CHECK is set. */
export function updateCheckEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !env.CI && !env.CITEPO_NO_UPDATE_CHECK
}

/**
 * Compare two semver version strings (e.g. "0.1.0" vs "0.2.0").
 * Returns true if remote > local.
 */
export function isNewerVersion(local: string, remote: string): boolean {
  const localParts = local.split('.').map(Number)
  const remoteParts = remote.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const l = localParts[i] ?? 0
    const r = remoteParts[i] ?? 0
    if (r > l) return true
    if (r < l) return false
  }

  return false
}

/**
 * Fetch latest version from npm registries using Promise.any().
 * Returns the version string or null if all requests fail.
 */
export async function fetchLatestVersion(): Promise<string | null> {
  try {
    return await Promise.any(
      REGISTRY_MIRRORS.map(async (url) => {
        const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { version?: string }
        if (!data.version) throw new Error('No version field')
        return data.version
      }),
    )
  } catch {
    // AggregateError — all requests failed
    return null
  }
}

function readCache(): UpdateCache | null {
  try {
    const data = JSON.parse(readFileSync(cachePath(), 'utf-8')) as Partial<UpdateCache>
    if (typeof data.latest === 'string' && typeof data.checkedAt === 'number') {
      return { latest: data.latest, checkedAt: data.checkedAt }
    }
  } catch {
    // Missing or unreadable cache: treat as never checked
  }
  return null
}

/** Record a version just seen on the registry (also used by `citepo upgrade`). */
export async function writeUpdateCache(latest: string, now = Date.now()): Promise<void> {
  try {
    await mkdir(citepoHome(), { recursive: true })
    await writeFile(cachePath(), JSON.stringify({ latest, checkedAt: now }) + '\n', 'utf-8')
  } catch {
    // A read-only home directory must not break any command
  }
}

/** Refresh the cached latest version when it is older than a day. Never throws. */
export async function refreshUpdateCache(now = Date.now()): Promise<void> {
  if (!updateCheckEnabled()) return
  const cache = readCache()
  if (cache && now - cache.checkedAt < CHECK_INTERVAL_MS) return
  const latest = await fetchLatestVersion()
  if (latest) await writeUpdateCache(latest, now)
}

/** Newer version known from the cache, or null. Reads no network. */
export function getUpdateInfo(current: string): UpdateInfo | null {
  if (!updateCheckEnabled()) return null
  const cache = readCache()
  if (!cache || !isNewerVersion(current, cache.latest)) return null
  return { current, latest: cache.latest, command: 'citepo upgrade' }
}
