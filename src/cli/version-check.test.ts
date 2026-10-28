import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getUpdateInfo,
  isNewerVersion,
  refreshUpdateCache,
  updateCheckEnabled,
  writeUpdateCache,
} from './version-check.js'

describe('isNewerVersion', () => {
  it('compares major, minor and patch', () => {
    expect(isNewerVersion('0.1.14', '0.2.0')).toBe(true)
    expect(isNewerVersion('0.2.0', '0.1.14')).toBe(false)
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false)
  })
})

describe('update cache', () => {
  let home: string
  const savedEnv = { ...process.env }

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'citepo-home-'))
    process.env.CITEPO_HOME = home
    delete process.env.CI
    delete process.env.CITEPO_NO_UPDATE_CHECK
  })

  afterEach(async () => {
    process.env = { ...savedEnv }
    vi.unstubAllGlobals()
    await rm(home, { recursive: true, force: true })
  })

  it('is disabled in CI and by env var', () => {
    expect(updateCheckEnabled({ CI: 'true' })).toBe(false)
    expect(updateCheckEnabled({ CITEPO_NO_UPDATE_CHECK: '1' })).toBe(false)
    expect(updateCheckEnabled({})).toBe(true)
  })

  it('reports a newer cached version', async () => {
    await writeUpdateCache('9.9.9')
    expect(getUpdateInfo('0.1.0')).toEqual({
      current: '0.1.0',
      latest: '9.9.9',
      command: 'citepo upgrade',
    })
    expect(getUpdateInfo('9.9.9')).toBeNull()
  })

  it('returns null without a cache', () => {
    expect(getUpdateInfo('0.1.0')).toBeNull()
  })

  it('fetches at most once a day', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ version: '1.2.3' })))
    vi.stubGlobal('fetch', fetchMock)

    await refreshUpdateCache(1_000)
    expect(getUpdateInfo('1.0.0')?.latest).toBe('1.2.3')
    await refreshUpdateCache(2_000)
    // Two mirrors are queried per refresh; the second refresh is within the interval
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
