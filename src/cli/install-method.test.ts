import { describe, expect, it } from 'vitest'
import { installFailureHint } from './commands/upgrade.js'
import { detectInstallMethod, globalInstallCommand } from './install-method.js'

const script = 'node_modules/citepo/dist/cli/index.js'

describe('detectInstallMethod', () => {
  it('recognizes global installs per package manager', () => {
    expect(detectInstallMethod(`/usr/local/lib/${script}`)).toMatchObject({
      kind: 'global',
      manager: 'npm',
    })
    expect(detectInstallMethod(`/Users/a/Library/pnpm/global/5/${script}`)).toMatchObject({
      kind: 'global',
      manager: 'pnpm',
    })
    expect(detectInstallMethod(`/Users/a/.bun/install/global/${script}`)).toMatchObject({
      manager: 'bun',
    })
    expect(detectInstallMethod(`/Users/a/.config/yarn/global/${script}`)).toMatchObject({
      manager: 'yarn',
    })
    expect(
      detectInstallMethod(`C:\\Users\\a\\AppData\\Roaming\\npm\\${script.replace(/\//g, '\\')}`),
    ).toMatchObject({
      manager: 'npm',
    })
  })

  it('recognizes npx, project dependencies and source checkouts', () => {
    expect(detectInstallMethod(`/Users/a/.npm/_npx/123/${script}`)).toEqual({ kind: 'npx' })
    expect(detectInstallMethod(`/work/blog/${script}`)).toEqual({ kind: 'project' })
    expect(detectInstallMethod('/work/citepo-cli/dist/cli/index.js')).toEqual({ kind: 'source' })
  })
})

describe('globalInstallCommand', () => {
  it('pins the exact version (pnpm skips versions younger than a day for @latest)', () => {
    expect(globalInstallCommand('pnpm', '0.2.1')).toEqual(['pnpm', 'add', '-g', 'citepo@0.2.1'])
    expect(globalInstallCommand('npm', '0.2.1')).toEqual(['npm', 'install', '-g', 'citepo@0.2.1'])
    expect(globalInstallCommand('yarn', '0.2.1')).toEqual(['yarn', 'global', 'add', 'citepo@0.2.1'])
    expect(globalInstallCommand('bun', '0.2.1')).toEqual(['bun', 'add', '-g', 'citepo@0.2.1'])
  })
})

describe('installFailureHint', () => {
  it('turns known package manager errors into a next step', () => {
    expect(
      installFailureHint(
        'exit code 1: Error: ERR_PNPM_GLOBAL_BIN_DIR_NOT_IN_PATH',
        'pnpm add -g citepo@0.2.1',
      ),
    ).toContain('pnpm setup')
    expect(
      installFailureHint('EACCES: permission denied', 'npm install -g citepo@0.2.1'),
    ).toContain('sudo npm install -g citepo@0.2.1')
    expect(installFailureHint('exit code 1', 'bun add -g citepo@0.2.1')).toBe(
      'Run it yourself: bun add -g citepo@0.2.1',
    )
  })
})
