import { realpathSync } from 'node:fs'

export type GlobalManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

/**
 * How the running citepo was installed, judged from the path of the executing script.
 * `citepo upgrade` uses it to upgrade with the same package manager.
 */
export type InstallMethod =
  | { kind: 'global'; manager: GlobalManager }
  | { kind: 'npx' }
  | { kind: 'project' }
  | { kind: 'source' }

/**
 * The global install command for an exact version. Not `@latest`: pnpm 11+ by default
 * skips versions younger than a day and would quietly install an older one.
 */
export function globalInstallCommand(manager: GlobalManager, version: string): string[] {
  const spec = `citepo@${version}`
  switch (manager) {
    case 'npm':
      return ['npm', 'install', '-g', spec]
    case 'pnpm':
      return ['pnpm', 'add', '-g', spec]
    case 'yarn':
      return ['yarn', 'global', 'add', spec]
    case 'bun':
      return ['bun', 'add', '-g', spec]
  }
}

export function detectInstallMethod(scriptPath = process.argv[1] ?? ''): InstallMethod {
  let resolved = scriptPath
  try {
    resolved = realpathSync(scriptPath)
  } catch {
    // Keep the given path
  }
  const p = resolved.replace(/\\/g, '/')

  if (!p.includes('/node_modules/citepo/')) return { kind: 'source' }
  if (
    p.includes('/_npx/') ||
    p.includes('/.pnpm-store/') ||
    p.includes('/dlx-') ||
    p.includes('/pnpm/dlx/')
  )
    return { kind: 'npx' }
  if (p.includes('/.bun/')) return { kind: 'global', manager: 'bun' }
  if (/\/pnpm\/global\//.test(p) || /\/\.pnpm-global\//.test(p) || /\/pnpm-global\//.test(p)) {
    return { kind: 'global', manager: 'pnpm' }
  }
  if (/\/yarn\/global\//.test(p) || /\/\.yarn-global\//.test(p)) {
    return { kind: 'global', manager: 'yarn' }
  }
  // npm's global prefix: <prefix>/lib/node_modules (Unix) or <prefix>/node_modules (Windows npm dir)
  if (/\/lib\/node_modules\/citepo\//.test(p) || /\/npm\/node_modules\/citepo\//.test(p)) {
    return { kind: 'global', manager: 'npm' }
  }
  return { kind: 'project' }
}
