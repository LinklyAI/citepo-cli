import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

/**
 * Installing the citepo agent skill (skills/citepo in the npm package) into the skill
 * folders of agent apps. The skill is copied, not linked, so it keeps working when the
 * package moves; a version file lets `skill update` and `citepo upgrade` refresh it.
 */

export const SKILL_NAME = 'citepo'
const VERSION_FILE = '.citepo-version'

/** User-level skill folders, per agent app. */
export const AGENT_SKILL_DIRS = {
  'claude-code': '.claude/skills',
  codex: '.agents/skills',
  cursor: '.cursor/skills',
  openclaw: '.openclaw/skills',
  opencode: '.config/opencode/skills',
  gemini: '.gemini/skills',
  agents: '.agents/skills',
} as const

export type AgentName = keyof typeof AGENT_SKILL_DIRS

export function isAgentName(name: string): name is AgentName {
  return name in AGENT_SKILL_DIRS
}

export function skillDirFor(agent: AgentName, home = homedir()): string {
  return path.join(home, AGENT_SKILL_DIRS[agent], SKILL_NAME)
}

export interface InstalledSkill {
  /** Agents that read this folder. */
  agents: AgentName[]
  path: string
  /** citepo version the copy came from; null when the folder exists without a version file. */
  version: string | null
}

/** True when `dir` holds a copy that citepo did not install (e.g. a git clone). */
export function isForeignCopy(dir: string): boolean {
  return existsSync(dir) && !existsSync(path.join(dir, VERSION_FILE))
}

/** Copy the skill into `targetDir`, replacing an older copy. */
export async function installSkill(
  sourceDir: string,
  targetDir: string,
  version: string,
): Promise<void> {
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(path.dirname(targetDir), { recursive: true })
  await cp(sourceDir, targetDir, { recursive: true })
  await writeFile(path.join(targetDir, VERSION_FILE), `${version}\n`, 'utf-8')
}

/** Every known skill folder that already holds the citepo skill. */
export async function findInstalledSkills(home = homedir()): Promise<InstalledSkill[]> {
  const byPath = new Map<string, InstalledSkill>()
  for (const agent of Object.keys(AGENT_SKILL_DIRS) as AgentName[]) {
    const dir = skillDirFor(agent, home)
    const existing = byPath.get(dir)
    if (existing) {
      existing.agents.push(agent)
      continue
    }
    if (!existsSync(path.join(dir, 'SKILL.md'))) continue
    let version: string | null = null
    try {
      version = (await readFile(path.join(dir, VERSION_FILE), 'utf-8')).trim() || null
    } catch {
      // Installed by other means (git clone, npx skills add)
    }
    byPath.set(dir, { agents: [agent], path: dir, version })
  }
  return [...byPath.values()]
}

/**
 * Refresh copies installed by citepo (those with a version file) to `version`.
 * Copies installed by other tools are left alone. Returns the refreshed paths.
 */
export async function updateInstalledSkills(
  sourceDir: string,
  version: string,
  home = homedir(),
): Promise<string[]> {
  const refreshed: string[] = []
  for (const skill of await findInstalledSkills(home)) {
    if (skill.version === null || skill.version === version) continue
    await installSkill(sourceDir, skill.path, version)
    refreshed.push(skill.path)
  }
  return refreshed
}
