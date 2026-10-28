import path from 'node:path'
import { Command } from 'commander'
import {
  AGENT_SKILL_DIRS,
  findInstalledSkills,
  installSkill,
  isForeignCopy,
  isAgentName,
  skillDirFor,
  updateInstalledSkills,
  type AgentName,
  type InstalledSkill,
} from '../../engine/skill-install.js'
import { CliError } from '../error.js'
import { mark, renderTable, style } from '../output.js'
import { action } from '../run.js'
import { getPackageRoot, getVersion } from '../utils.js'

const AGENT_LIST = Object.keys(AGENT_SKILL_DIRS).join(', ')

export function skillSourceDir(): string {
  return path.join(getPackageRoot(), 'skills', 'citepo')
}

function parseAgents(value: string | undefined): AgentName[] {
  if (!value) {
    throw new CliError({
      code: 'missing_option',
      message: 'Say which agent app to install the skill for',
      expected: AGENT_LIST,
      hint: 'Example: citepo skill install --agent claude-code (several: --agent claude-code,codex)',
    })
  }
  const names = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const unknown = names.filter((n) => !isAgentName(n))
  if (unknown.length > 0) {
    throw new CliError({
      code: 'invalid_option',
      message: `Unknown agent "${unknown.join(', ')}"`,
      expected: AGENT_LIST,
      hint: 'For another app, use --dir <its skills folder>.',
    })
  }
  return names as AgentName[]
}

const installCommand = new Command('install')
  .description('Install the citepo skill so an agent app knows how to use citepo')
  .option('--agent <names>', `comma separated: ${AGENT_LIST}`)
  .option('--dir <path>', 'install into this skills folder instead (creates <path>/citepo)')
  .option('--force', 'replace a citepo skill folder that was installed another way')
  .addHelpText(
    'after',
    `
Folders: ${Object.entries(AGENT_SKILL_DIRS)
      .map(([agent, dir]) => `${agent} ~/${dir}`)
      .join(', ')}.
Start a new session in the agent app afterwards so it loads the skill.`,
  )
  .action(
    action(async (_ctx, flags: { agent?: string; dir?: string; force?: boolean }) => {
      const version = await getVersion()
      const targets = flags.dir
        ? [path.resolve(flags.dir, 'citepo')]
        : [...new Set(parseAgents(flags.agent).map((agent) => skillDirFor(agent)))]
      const foreign = flags.force ? undefined : targets.find(isForeignCopy)
      if (foreign) {
        throw new CliError({
          code: 'skill_exists',
          message: `${foreign} already exists and was not installed by citepo`,
          hint: 'It may be a git clone or a copy from `npx skills add`. Pass --force to replace it.',
        })
      }
      for (const target of targets) await installSkill(skillSourceDir(), target, version)
      return {
        data: { version, installed: targets },
        render: () =>
          [
            '',
            ...targets.map(
              (t) => `  ${mark.ok()} Installed the citepo skill ${version} in ${style.bold(t)}`,
            ),
            '',
            '  Start a new session in the agent app so it loads the skill.',
            '',
          ].join('\n'),
      }
    }),
  )

const updateCommand = new Command('update')
  .description('Refresh installed copies of the skill to this citepo version')
  .action(
    action(async () => {
      const version = await getVersion()
      const updated = await updateInstalledSkills(skillSourceDir(), version)
      return {
        data: { version, updated },
        render: () =>
          updated.length === 0
            ? `\n  ${mark.ok()} Installed skills are up to date (${version}).\n`
            : ['', ...updated.map((p) => `  ${mark.ok()} Updated ${p} to ${version}`), ''].join(
                '\n',
              ),
      }
    }),
  )

const statusCommand = new Command('status')
  .description('Show where the citepo skill is installed and its version')
  .action(
    action(async () => {
      const version = await getVersion()
      const installed = await findInstalledSkills()
      return {
        data: { version, installed },
        render: () => renderStatus(installed, version),
      }
    }),
  )

function renderStatus(installed: InstalledSkill[], version: string): string {
  if (installed.length === 0) {
    return `\n  ${mark.warn()} The citepo skill is not installed. Run ${style.cyan('citepo skill install --agent <app>')}.\n`
  }
  const rows = installed.map((s) => [
    s.agents.join(', '),
    s.path,
    s.version === null
      ? style.dim('other source')
      : s.version === version
        ? s.version
        : style.yellow(`${s.version} (update available)`),
  ])
  return `\n${renderTable(['Agent', 'Folder', 'Version'], rows)}\n`
}

export const skillCommand = new Command('skill')
  .description('Install the citepo agent skill into agent apps')
  .addCommand(installCommand)
  .addCommand(updateCommand)
  .addCommand(statusCommand)
