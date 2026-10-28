import { CliError } from '../error.js'
import { loadCredentials, type ActiveCredentials } from './credentials.js'

/**
 * Calls to the CitePo platform API with the stored token. Errors become CliErrors with
 * a code and the next step, so commands can let them propagate.
 */

const TIMEOUT_MS = 30_000

/** Error codes the platform returns, mapped to what the user should do next. */
const PLATFORM_HINTS: Record<string, string> = {
  github_not_linked:
    'Link GitHub to your CitePo account once: open the site settings in the browser (`citepo site open --settings`) and choose Connect repository.',
  app_not_installed:
    'Install the CitePo GitHub App on the repository: open the site settings (`citepo site open --settings`), choose Connect repository, and grant the app access to it.',
}

export interface PlatformErrorBody {
  error?: string
  message?: string
  code?: string
}

export async function requireCredentials(): Promise<ActiveCredentials> {
  const credentials = await loadCredentials()
  if (!credentials) {
    throw new CliError({
      code: 'not_logged_in',
      message: 'Not signed in to CitePo',
      hint: 'Run `citepo auth login` (agents: `citepo auth login --no-wait --json`), or set CITEPO_TOKEN.',
    })
  }
  return credentials
}

/** Raw request without credentials (used by the login flow). */
export async function platformFetch(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (err) {
    throw new CliError({
      code: 'network_error',
      message: `Could not reach ${new URL(url).origin}: ${err instanceof Error ? err.message : String(err)}`,
      hint: 'Check the network connection and try again.',
    })
  }
}

/** Authenticated JSON request. `path` starts with /api/. */
export async function api<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const credentials = await requireCredentials()
  const res = await platformFetch(`${credentials.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${credentials.token}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const data = (await res.json().catch(() => ({}))) as T & PlatformErrorBody
  if (res.ok) return data

  if (res.status === 401) {
    throw new CliError({
      code: 'not_logged_in',
      message: data.error ?? 'The CitePo token is invalid or revoked',
      hint:
        credentials.source === 'env'
          ? 'CITEPO_TOKEN is not valid. Create a new one with `citepo auth login` and `citepo auth token`.'
          : 'Run `citepo auth login` again.',
    })
  }
  const code = data.code ?? `http_${res.status}`
  throw new CliError({
    code,
    message: data.error ?? data.message ?? `CitePo returned HTTP ${res.status}`,
    ...(PLATFORM_HINTS[code] ? { hint: PLATFORM_HINTS[code] } : {}),
  })
}
