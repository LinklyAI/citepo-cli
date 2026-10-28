import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { Command } from 'commander'
import { loadBlogConfig } from '../../engine/config.js'
import { EXIT, toErrorDetails } from '../error.js'
import { mark, renderTable, style } from '../output.js'
import { action } from '../run.js'
import { getVersion } from '../utils.js'
import { fetchLatestVersion, isNewerVersion } from '../version-check.js'
import { findInstalledSkills } from '../../engine/skill-install.js'

const execFileAsync = promisify(execFile)

export type DoctorStatus = 'ok' | 'warn' | 'fail'

export interface DoctorCheck {
  /** Stable id, e.g. "node". */
  name: string
  status: DoctorStatus
  message: string
  hint?: string
}

export interface DoctorReport {
  /** True when nothing failed: citepo can build and publish from here. */
  ready: boolean
  checks: DoctorCheck[]
}

/** Lowest Node.js version citepo supports (sharp needs 18.17). */
const MIN_NODE = [18, 17] as const

async function tryRun(bin: string, args: string[]): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, { timeout: 5000 })
    return `${stdout}${stderr}`.trim()
  } catch {
    return null
  }
}

export function checkNode(version = process.versions.node): DoctorCheck {
  const [major = 0, minor = 0] = version.split('.').map(Number)
  const ok = major > MIN_NODE[0] || (major === MIN_NODE[0] && minor >= MIN_NODE[1])
  return ok
    ? { name: 'node', status: 'ok', message: `Node.js ${version}` }
    : {
        name: 'node',
        status: 'fail',
        message: `Node.js ${version} is too old`,
        hint: `Install Node.js 20 or newer (at least ${MIN_NODE.join('.')}).`,
      }
}

async function checkCli(): Promise<DoctorCheck> {
  const current = await getVersion()
  const latest = await fetchLatestVersion()
  if (!latest)
    return {
      name: 'citepo',
      status: 'warn',
      message: `citepo ${current} (could not reach npm to compare)`,
    }
  return isNewerVersion(current, latest)
    ? {
        name: 'citepo',
        status: 'warn',
        message: `citepo ${current}; ${latest} is available`,
        hint: 'Run `citepo upgrade`.',
      }
    : { name: 'citepo', status: 'ok', message: `citepo ${current} (latest)` }
}

async function checkSkill(): Promise<DoctorCheck> {
  const current = await getVersion()
  const installed = await findInstalledSkills()
  if (installed.length === 0) {
    return {
      name: 'skill',
      status: 'warn',
      message: 'The citepo agent skill is not installed',
      hint: 'Run `citepo skill install --agent <app>` (claude-code, codex, openclaw, ...).',
    }
  }
  const outdated = installed.filter((s) => s.version !== null && s.version !== current)
  const where = installed.map((s) => s.agents.join('/')).join(', ')
  return outdated.length > 0
    ? {
        name: 'skill',
        status: 'warn',
        message: `Skill installed for ${where}, but outdated`,
        hint: 'Run `citepo skill update`.',
      }
    : { name: 'skill', status: 'ok', message: `Skill installed for ${where}` }
}

async function checkGit(): Promise<DoctorCheck> {
  const out = await tryRun('git', ['--version'])
  return out
    ? { name: 'git', status: 'ok', message: out }
    : {
        name: 'git',
        status: 'fail',
        message: 'git is not installed',
        hint: 'Install git: publishing a blog is a git push.',
      }
}

async function checkGh(): Promise<DoctorCheck> {
  const version = await tryRun('gh', ['--version'])
  if (!version) {
    return {
      name: 'gh',
      status: 'warn',
      message: 'GitHub CLI (gh) is not installed',
      hint: 'Optional: with gh an agent can create the GitHub repository (https://cli.github.com).',
    }
  }
  const auth = await tryRun('gh', ['auth', 'status'])
  return auth
    ? { name: 'gh', status: 'ok', message: version.split('\n')[0]! + ', signed in' }
    : {
        name: 'gh',
        status: 'warn',
        message: 'gh is installed but not signed in',
        hint: 'Run `gh auth login`.',
      }
}

async function checkProject(dir: string): Promise<DoctorCheck[]> {
  if (!existsSync(path.join(dir, 'blog.json'))) {
    return [
      {
        name: 'project',
        status: 'warn',
        message: 'This folder is not a CitePo blog (no blog.json)',
        hint: 'Create one with `citepo init <dir>`, or cd into an existing blog.',
      },
    ]
  }
  const checks: DoctorCheck[] = []
  try {
    const config = await loadBlogConfig(dir)
    checks.push({
      name: 'project',
      status: 'ok',
      message: `Blog "${config.name}" (blog.json is valid)`,
    })
  } catch (err) {
    const details = toErrorDetails(err)
    checks.push({ name: 'project', status: 'fail', message: details.message, hint: details.hint })
  }

  const remote = await tryRun('git', ['-C', dir, 'remote', 'get-url', 'origin'])
  const isRepo =
    remote !== null || (await tryRun('git', ['-C', dir, 'rev-parse', '--git-dir'])) !== null
  checks.push(
    remote
      ? { name: 'repository', status: 'ok', message: `Git remote ${remote}` }
      : {
          name: 'repository',
          status: 'warn',
          message: isRepo ? 'Git repository without a remote' : 'Not a git repository yet',
          hint: 'Create a GitHub repository and push this folder to publish it.',
        },
  )
  return checks
}

export async function runDoctor(dir: string): Promise<DoctorReport> {
  const [cli, skill, git, gh, project] = await Promise.all([
    checkCli(),
    checkSkill(),
    checkGit(),
    checkGh(),
    checkProject(dir),
  ])
  const checks = [checkNode(), cli, skill, git, gh, ...project]
  return { ready: checks.every((c) => c.status !== 'fail'), checks }
}

const STATUS_MARK: Record<DoctorStatus, () => string> = {
  ok: mark.ok,
  warn: mark.warn,
  fail: mark.error,
}

export const doctorCommand = new Command('doctor')
  .description(
    'Check this machine and folder: Node.js, citepo, agent skill, git, GitHub CLI, blog project',
  )
  .action(
    action(async () => {
      const report = await runDoctor(process.cwd())
      const exitCode = !report.ready
        ? EXIT.error
        : report.checks.some((c) => c.status === 'warn')
          ? EXIT.warnings
          : EXIT.ok
      return {
        data: report,
        exitCode,
        render: (r: DoctorReport) => {
          const rows = r.checks.flatMap((c) => [
            [STATUS_MARK[c.status](), c.name, c.message],
            ...(c.hint ? [['', '', `${style.cyan('→')} ${c.hint}`]] : []),
          ])
          return `\n${renderTable(['', 'Check', 'Result'], rows)}\n`
        },
      }
    }),
  )
