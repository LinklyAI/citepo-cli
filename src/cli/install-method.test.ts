import { describe, expect, it } from 'vitest'
import { detectInstallMethod } from './install-method.js'

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
