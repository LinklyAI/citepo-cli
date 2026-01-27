import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFile } from 'node:fs/promises'

/** Get the CLI package root directory (where package.json is located) */
export function getPackageRoot(): string {
  const currentFile = fileURLToPath(import.meta.url)
  // dist/cli/index.js -> package root
  return join(dirname(currentFile), '..', '..')
}

/** Read the version from package.json */
export async function getVersion(): Promise<string> {
  const pkgPath = join(getPackageRoot(), 'package.json')
  const content = await readFile(pkgPath, 'utf-8')
  const pkg = JSON.parse(content) as { version: string }
  return pkg.version
}
