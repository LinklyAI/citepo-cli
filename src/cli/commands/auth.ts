import { hostname, platform } from 'node:os'
import { Command } from 'commander'
import { CliError } from '../error.js'
import { mark, style } from '../output.js'
import { action, type CommandOutcome } from '../run.js'
import { getVersion } from '../utils.js'
import { api, platformFetch } from '../platform/client.js'
import { openBrowser } from '../platform/browser.js'
import {
  apiUrl,
  deleteCredentials,
  deletePendingLogin,
  loadCredentials,
  loadPendingLogin,
  saveCredentials,
  savePendingLogin,
  type PendingLogin,
} from '../platform/credentials.js'

interface StartResponse {
  device_code: string
  user_code: string
  expires_in: number
  interval: number
}

type PollResponse =
  | { status: 'pending' | 'slow_down'; interval: number }
  | { status: 'approved'; token: string; email: string }
  | { status: 'denied' | 'expired' | 'delivered' | 'invalid' }

export interface AccountInfo {
  email: string
  name: string
  plan: string
  githubLinked: boolean
}

type LoginResult =
  | { status: 'pending'; url: string; code: string; expiresAt: string; next: string }
  | { status: 'signed_in'; email: string }

type StatusResult =
  | { signedIn: false }
  | ({ signedIn: true; source: 'env' | 'file'; apiUrl: string } & AccountInfo)

const USER_CODE = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/
/** Polls that fail (network, 5xx, proxy pages) before a waiting login gives up. */
const MAX_POLL_FAILURES = 5

/** Default time `auth login --wait` waits; agents re-run it on `login_timeout`. */
const DEFAULT_WAIT_SECONDS = 300

async function startLogin(): Promise<PendingLogin> {
  const base = apiUrl()
  const res = await platformFetch(`${base}/api/cli/auth/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_info: { hostname: hostname(), os: platform(), version: await getVersion() },
    }),
  })
  const data = (await res.json().catch(() => ({}))) as Partial<StartResponse> & { message?: string }
  if (!res.ok || !data.device_code || !data.user_code || !USER_CODE.test(data.user_code)) {
    throw new CliError({
      code: res.status === 429 ? 'rate_limited' : 'login_failed',
      message: data.message ?? `Could not start the login (HTTP ${res.status})`,
    })
  }
  const pending: PendingLogin = {
    deviceCode: data.device_code,
    userCode: data.user_code,
    // Built here, not taken from the response: the CLI only ever opens a page on the API host.
    // The code in the link lets the page approve with one click; it shows the device and code.
    url: `${base}/cli/auth?code=${data.user_code}`,
    interval: data.interval ?? 5,
    expiresAt: Date.now() + (data.expires_in ?? 600) * 1000,
    apiUrl: base,
  }
  await savePendingLogin(pending)
  return pending
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Poll until approved, denied or expired, or until `timeoutSeconds` pass. */
async function waitForApproval(
  pending: PendingLogin,
  timeoutSeconds: number,
): Promise<{ email: string }> {
  const deadline = Math.min(Date.now() + timeoutSeconds * 1000, pending.expiresAt)
  let interval = pending.interval
  let failures = 0
  for (;;) {
    // A failed poll keeps the pending login: the user may already have approved it
    const data = await pollOnce(pending).catch(() => null)
    if (!data) {
      if (++failures >= MAX_POLL_FAILURES) {
        throw new CliError({
          code: 'network_error',
          message: 'Could not reach CitePo to finish the login',
          hint: 'Check the network, then run `citepo auth login --wait` again; the login is kept.',
        })
      }
      await sleep(interval * 1000)
      continue
    }
    failures = 0
    switch (data.status) {
      case 'approved':
        await saveCredentials({ token: data.token, email: data.email, apiUrl: pending.apiUrl })
        await deletePendingLogin()
        return { email: data.email }
      case 'pending':
      case 'slow_down':
        interval = data.interval
        break
      case 'denied':
        await deletePendingLogin()
        throw new CliError({
          code: 'login_denied',
          message: 'The login was denied in the browser',
          hint: 'Run `citepo auth login` to try again.',
        })
      case 'expired':
      case 'delivered':
      case 'invalid':
        await deletePendingLogin()
        throw new CliError({
          code: 'login_expired',
          message: 'The login expired or was already used',
          hint: 'Run `citepo auth login` to start a new one.',
        })
      default:
        // Unknown answer: treat like a failed poll
        failures++
        break
    }
    if (Date.now() + interval * 1000 > deadline) {
      if (Date.now() + interval * 1000 > pending.expiresAt) {
        await deletePendingLogin()
        throw new CliError({
          code: 'login_expired',
          message: 'The login link expired',
          hint: 'Run `citepo auth login` again.',
        })
      }
      throw new CliError({
        code: 'login_timeout',
        message: 'Still waiting for approval in the browser',
        hint: `Ask the user to open ${pending.url}, check that the page shows code ${pending.userCode} and approve, then run \`citepo auth login --wait\` again.`,
      })
    }
    await sleep(interval * 1000)
  }
}

/** One poll; throws on network errors and on non-JSON or non-2xx answers. */
async function pollOnce(pending: PendingLogin): Promise<PollResponse> {
  const res = await platformFetch(`${pending.apiUrl}/api/cli/auth/poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_code: pending.deviceCode }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as PollResponse
}

interface LoginFlags {
  /** true with --wait, false with --no-wait, undefined with neither */
  wait?: boolean
  timeout: string
  restart?: boolean
}

const loginCommand = new Command('login')
  .description('Sign in to CitePo: approve in the browser on any device')
  // --wait first: then --no-wait does not turn the default into true
  .option('--wait', 'finish a login started with --no-wait (repeatable)')
  .option('--no-wait', 'start the login, print the link and code, and return at once')
  .option('--timeout <seconds>', 'how long to wait for approval', String(DEFAULT_WAIT_SECONDS))
  .option('--restart', 'drop a pending login and start a new one')
  .addHelpText(
    'after',
    `
For people: run \`citepo auth login\`, approve in the browser that opens.
For agents (no browser, tool calls time out):
  citepo auth login --no-wait --json    # gives url and code: send both to the user to approve
  citepo auth login --wait --json       # after the user approved; repeat on login_timeout
Or set CITEPO_TOKEN (see \`citepo auth token\`).`,
  )
  .action(
    action(async (ctx, flags: LoginFlags): Promise<CommandOutcome<LoginResult>> => {
      const timeout = Number(flags.timeout)
      if (!Number.isFinite(timeout) || timeout <= 0) {
        throw new CliError({
          code: 'invalid_option',
          message: `Invalid --timeout "${flags.timeout}"`,
          expected: 'seconds, e.g. 300',
        })
      }
      // With both --wait and --no-wait defined, commander leaves `wait` undefined by default
      const noWait = flags.wait === false
      const resumeOnly = flags.wait === true

      let pending = flags.restart ? null : await loadPendingLogin()
      if (pending && pending.expiresAt <= Date.now()) pending = null
      if (!pending) {
        if (resumeOnly) {
          throw new CliError({
            code: 'no_pending_login',
            message: 'No login is waiting for approval',
            hint: 'Start one with `citepo auth login --no-wait`.',
          })
        }
        pending = await startLogin()
      }

      const instructions = {
        url: pending.url,
        code: pending.userCode,
        expiresAt: new Date(pending.expiresAt).toISOString(),
      }
      if (noWait) {
        return {
          data: { status: 'pending' as const, ...instructions, next: 'citepo auth login --wait' },
          render: () =>
            `\n  Open ${style.cyan(pending.url)} and approve (code ${style.bold(pending.userCode)}).\n  Then run ${style.cyan('citepo auth login --wait')}.\n`,
        }
      }

      if (!ctx.json) {
        console.log(
          `\n  Approve in the browser: ${style.cyan(pending.url)} (code ${style.bold(pending.userCode)}). Waiting...`,
        )
        openBrowser(pending.url)
      }
      const { email } = await waitForApproval(pending, timeout)
      return {
        data: { status: 'signed_in' as const, email },
        render: () => `\n  ${mark.ok()} Signed in to CitePo as ${style.bold(email)}\n`,
      }
    }),
  )

const statusCommand = new Command('status')
  .description('Show which CitePo account the CLI uses')
  .action(
    action(async (): Promise<CommandOutcome<StatusResult>> => {
      const credentials = await loadCredentials()
      if (!credentials) {
        return {
          data: { signedIn: false as const },
          render: () =>
            `\n  ${mark.warn()} Not signed in. Run ${style.cyan('citepo auth login')}.\n`,
        }
      }
      const account = await api<AccountInfo>('GET', '/api/cli/me')
      const data = {
        signedIn: true as const,
        source: credentials.source,
        apiUrl: credentials.apiUrl,
        ...account,
      }
      return {
        data,
        render: () =>
          [
            '',
            `  ${mark.ok()} Signed in as ${style.bold(account.email)} (${account.plan})${credentials.source === 'env' ? style.dim(' via CITEPO_TOKEN') : ''}`,
            account.githubLinked
              ? `  ${mark.ok()} GitHub linked: repositories can be connected from the CLI`
              : `  ${mark.warn()} GitHub not linked yet: the first repository is connected in the browser`,
            '',
          ].join('\n'),
      }
    }),
  )

const logoutCommand = new Command('logout')
  .description('Sign out and revoke the token on CitePo')
  .action(
    action(async () => {
      const credentials = await loadCredentials()
      if (credentials?.source === 'env') {
        throw new CliError({
          code: 'token_from_env',
          message: 'The token comes from CITEPO_TOKEN',
          hint: 'Unset CITEPO_TOKEN in the environment of this agent or shell.',
        })
      }
      let revoked = true
      if (credentials) {
        // An unreachable server must not keep the token on disk; say it may still work
        const res = await platformFetch(`${credentials.apiUrl}/api/cli/auth/revoke`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${credentials.token}` },
        }).catch(() => null)
        revoked = Boolean(res && (res.ok || res.status === 401))
      }
      await deleteCredentials()
      await deletePendingLogin()
      return {
        data: { signedIn: false, revoked },
        render: () =>
          revoked
            ? `\n  ${mark.ok()} Signed out.\n`
            : `\n  ${mark.warn()} Signed out here, but CitePo could not be reached to revoke the token.\n  Revoke it in the CitePo dashboard under CLI sign-ins.\n`,
      }
    }),
  )

const tokenCommand = new Command('token')
  .description('Print the API token, e.g. to set CITEPO_TOKEN for an agent on a server')
  .action(
    action(async () => {
      const credentials = await loadCredentials()
      if (!credentials) {
        throw new CliError({
          code: 'not_logged_in',
          message: 'Not signed in to CitePo',
          hint: 'Run `citepo auth login` first.',
        })
      }
      // The token grants full access: say so where people and agent transcripts see it
      process.stderr.write(
        '  ! This token gives full access to your CitePo sites. Keep it secret; revoke it in the CitePo dashboard (CLI sign-ins) if it leaks.\n',
      )
      return { data: { token: credentials.token }, render: () => credentials.token }
    }),
  )

export const authCommand = new Command('auth')
  .description('Sign in to the CitePo platform')
  .addCommand(loginCommand)
  .addCommand(statusCommand)
  .addCommand(logoutCommand)
  .addCommand(tokenCommand)
