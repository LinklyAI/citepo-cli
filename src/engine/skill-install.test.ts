import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  findInstalledSkills,
  installSkill,
  skillDirFor,
  updateInstalledSkills,
} from './skill-install.js'

describe('skill install', () => {
  let home: string
  let source: string

  beforeEach(async () => {
    home = await mkdtemp(path.join(tmpdir(), 'citepo-skill-'))
    source = path.join(home, 'source')
    await mkdir(path.join(source, 'references'), { recursive: true })
    await writeFile(path.join(source, 'SKILL.md'), 'v1')
    await writeFile(path.join(source, 'references', 'a.md'), 'ref')
  })

  afterEach(async () => {
    await rm(home, { recursive: true, force: true })
  })

  it('copies the skill and reports shared folders once', async () => {
    await installSkill(source, skillDirFor('codex', home), '1.0.0')
    expect(await readFile(path.join(home, '.agents/skills/citepo/references/a.md'), 'utf-8')).toBe(
      'ref',
    )

    const installed = await findInstalledSkills(home)
    expect(installed).toEqual([
      {
        agents: ['codex', 'agents'],
        path: path.join(home, '.agents/skills/citepo'),
        version: '1.0.0',
      },
    ])
  })

  it('updates only copies it installed', async () => {
    await installSkill(source, skillDirFor('claude-code', home), '1.0.0')
    const foreign = skillDirFor('openclaw', home)
    await mkdir(foreign, { recursive: true })
    await writeFile(path.join(foreign, 'SKILL.md'), 'cloned')

    await writeFile(path.join(source, 'SKILL.md'), 'v2')
    const updated = await updateInstalledSkills(source, '2.0.0', home)
    expect(updated).toEqual([skillDirFor('claude-code', home)])
    expect(await readFile(path.join(skillDirFor('claude-code', home), 'SKILL.md'), 'utf-8')).toBe(
      'v2',
    )
    expect(await readFile(path.join(foreign, 'SKILL.md'), 'utf-8')).toBe('cloned')
  })
})
