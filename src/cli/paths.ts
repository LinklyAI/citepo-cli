import { homedir } from 'node:os'
import { join } from 'node:path'

/** Directory for CLI state (update check cache, credentials). Override with CITEPO_HOME. */
export function citepoHome(): string {
  return process.env.CITEPO_HOME || join(homedir(), '.citepo')
}
