import { spawn } from 'node:child_process'

/** Open an http(s) URL in the default browser, only for a person at a local terminal. */
export function openBrowser(url: string): void {
  if (!process.stdout.isTTY || process.env.SSH_CONNECTION || process.env.CI) return
  if (!/^https?:\/\//.test(url)) return
  // No shell on Windows: `cmd /c start` would interpret & and ^ in the URL
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'rundll32' : 'xdg-open'
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url]
  try {
    spawn(command, args, { stdio: 'ignore', detached: true })
      .on('error', () => undefined)
      .unref()
  } catch {
    // The URL is printed anyway
  }
}
