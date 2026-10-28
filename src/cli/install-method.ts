import { realpathSync } from 'node:fs'

/**
 * How the running citepo was installed, judged from the path of the executing script.
 * `citepo upgrade` uses it to upgrade with the same package manager.
 */
export type InstallMethod =
  | { kind: 'global'; manager: 'npm' | 'pnpm' | 'yarn' | 'bun'; command: string[] }
  | { kind: 'npx' }
  | { kind: 'project' }
  | { kind: 'source' }

const PACKAGE = 'citepo@latest'

export function detectInstallMethod(scriptPath = process.argv[1] ?? ''): InstallMethod {
  let resolved = scriptPath
  try {
    resolved = realpathSync(scriptPath)
  } catch {
    // Keep the given path
  }
  const p = resolved.replace(/\\/g, '/')

  if (!p.includes('/node_modules/citepo/')) return { kind: 'source' }
  if (p.includes('/_npx/') || p.includes('/.pnpm-store/') || p.includes('/dlx-'))
    return { kind: 'npx' }
  if (p.includes('/.bun/'))
    return { kind: 'global', manager: 'bun', command: ['bun', 'add', '-g', PACKAGE] }
  if (/\/pnpm\/global\//.test(p) || /\/\.pnpm-global\//.test(p) || /\/pnpm-global\//.test(p)) {
    return { kind: 'global', manager: 'pnpm', command: ['pnpm', 'add', '-g', PACKAGE] }
  }
  if (/\/yarn\/global\//.test(p) || /\/\.yarn-global\//.test(p)) {
    return { kind: 'global', manager: 'yarn', command: ['yarn', 'global', 'add', PACKAGE] }
  }
  // npm's global prefix: <prefix>/lib/node_modules (Unix) or <prefix>/node_modules (Windows npm dir)
  if (/\/lib\/node_modules\/citepo\//.test(p) || /\/npm\/node_modules\/citepo\//.test(p)) {
    return { kind: 'global', manager: 'npm', command: ['npm', 'install', '-g', PACKAGE] }
  }
  return { kind: 'project' }
}
