import { getVersion } from './utils.js'

const REGISTRY_MIRRORS = [
  'https://registry.npmjs.org/citepo/latest',
  'https://registry.npmmirror.com/citepo/latest',
]

const TIMEOUT_MS = 3000

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
async function fetchLatestVersion(): Promise<string | null> {
  try {
    const result = await Promise.any(
      REGISTRY_MIRRORS.map(async (url) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

        try {
          const res = await fetch(url, { signal: controller.signal })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = (await res.json()) as { version?: string }
          if (!data.version) throw new Error('No version field')
          return data.version
        } finally {
          clearTimeout(timer)
        }
      }),
    )
    return result
  } catch {
    // AggregateError — all requests failed, silently ignore
    return null
  }
}

/**
 * Check for CLI updates in the background (fire-and-forget).
 * Outputs a one-line tip if a newer version is available.
 */
export function checkForUpdates(): void {
  void (async () => {
    try {
      const [currentVersion, latestVersion] = await Promise.all([
        getVersion(),
        fetchLatestVersion(),
      ])

      if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
        console.log(
          `\n  Update available: ${currentVersion} → ${latestVersion}. Run \`npm install -g citepo@latest\` to upgrade.\n`,
        )
      }
    } catch {
      // Silently ignore any errors — don't interfere with CLI
    }
  })()
}
