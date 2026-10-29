import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { CliError } from '../error.js'
import path from 'node:path'
import { citepoHome } from '../paths.js'

/**
 * Credentials for the CitePo platform (citepo.com).
 *
 * `citepo auth login` stores an API token in ~/.citepo/credentials.json (mode 0600).
 * CITEPO_TOKEN overrides it, for agents whose host injects secrets as environment
 * variables (e.g. OpenClaw) and for CI.
 */

export const DEFAULT_API_URL = 'https://citepo.com'

export interface StoredCredentials {
  token: string
  email?: string
  apiUrl?: string
}

export interface ActiveCredentials {
  token: string
  email?: string
  apiUrl: string
  source: 'env' | 'file'
}

/** A login started with `auth login --no-wait`, finished by `auth login --wait`. */
export interface PendingLogin {
  deviceCode: string
  userCode: string
  url: string
  interval: number
  expiresAt: number
  apiUrl: string
}

function credentialsPath(): string {
  return path.join(citepoHome(), 'credentials.json')
}

function pendingPath(): string {
  return path.join(citepoHome(), 'pending-login.json')
}

/**
 * The platform base URL. CITEPO_API_URL may point elsewhere (staging, local development),
 * but tokens never travel over plain http except to localhost.
 */
export function apiUrl(): string {
  const raw = (process.env.CITEPO_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new CliError({ code: 'invalid_option', message: `CITEPO_API_URL is not a URL: ${raw}` })
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new CliError({
      code: 'invalid_option',
      message: `CITEPO_API_URL must use https (got ${raw})`,
      expected: 'https://citepo.com, or http://localhost for development',
    })
  }
  if (raw !== DEFAULT_API_URL && !warnedAboutHost) {
    warnedAboutHost = true
    process.stderr.write(`  ! Using CitePo at ${raw} (CITEPO_API_URL)\n`)
  }
  return raw
}

let warnedAboutHost = false

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf-8')) as T
  } catch {
    return null
  }
}

/** Write through a temp file so a crash never leaves half a file; readable by the owner only. */
async function writePrivateJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temp = `${file}.tmp`
  // A temp file left by a crash keeps its old mode: remove it, then create it 0600
  await rm(temp, { force: true })
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
  await chmod(temp, 0o600)
  await rename(temp, file)
}

export async function loadCredentials(): Promise<ActiveCredentials | null> {
  const envToken = process.env.CITEPO_TOKEN?.trim()
  if (envToken) return { token: envToken, apiUrl: apiUrl(), source: 'env' }
  const stored = await readJson<StoredCredentials>(credentialsPath())
  if (!stored?.token) return null
  return {
    token: stored.token,
    email: stored.email,
    apiUrl: (stored.apiUrl ?? apiUrl()).replace(/\/+$/, ''),
    source: 'file',
  }
}

export async function saveCredentials(credentials: StoredCredentials): Promise<void> {
  await writePrivateJson(credentialsPath(), credentials)
}

export async function deleteCredentials(): Promise<void> {
  await rm(credentialsPath(), { force: true })
}

export async function loadPendingLogin(): Promise<PendingLogin | null> {
  return readJson<PendingLogin>(pendingPath())
}

export async function savePendingLogin(pending: PendingLogin): Promise<void> {
  await writePrivateJson(pendingPath(), pending)
}

export async function deletePendingLogin(): Promise<void> {
  await rm(pendingPath(), { force: true })
}
