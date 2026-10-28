import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
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

export function apiUrl(): string {
  return (process.env.CITEPO_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')
}

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
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
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
