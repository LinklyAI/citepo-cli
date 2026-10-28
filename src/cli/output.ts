/**
 * Terminal output helpers shared by all commands.
 *
 * Every command produces one result that is either rendered for people (colors, aligned
 * tables) or printed as JSON with `--json`. Colors are only used when stdout is a
 * terminal and NO_COLOR is not set, so piped output stays plain text.
 */

type Style = (text: string) => string

function colorEnabled(): boolean {
  if (process.env.NO_COLOR) return false
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0') return true
  return Boolean(process.stdout.isTTY)
}

function ansi(open: number, close: number): Style {
  return (text) => (colorEnabled() ? `\x1b[${open}m${text}\x1b[${close}m` : text)
}

export const style = {
  bold: ansi(1, 22),
  dim: ansi(2, 22),
  red: ansi(31, 39),
  green: ansi(32, 39),
  yellow: ansi(33, 39),
  cyan: ansi(36, 39),
} satisfies Record<string, Style>

/** Status markers keep a text symbol so the meaning survives without color. */
export const mark = {
  ok: () => style.green('✓'),
  error: () => style.red('✗'),
  warn: () => style.yellow('!'),
  info: () => style.cyan('•'),
}

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g

/** Width of a string in terminal columns: ANSI codes take none, CJK and emoji take two. */
export function displayWidth(text: string): number {
  let width = 0
  for (const char of text.replace(ANSI_PATTERN, '')) {
    const code = char.codePointAt(0) ?? 0
    width += isWide(code) ? 2 : 1
  }
  return width
}

function isWide(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  )
}

function padEnd(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)))
}

/** Render rows as an aligned table with a dimmed header row, indented by two spaces. */
export function renderTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, i) =>
    Math.max(displayWidth(header), ...rows.map((row) => displayWidth(row[i] ?? ''))),
  )
  const line = (cells: string[]) =>
    '  ' +
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : padEnd(cell, widths[i] ?? 0)))
      .join('  ')
      .trimEnd()
  return [style.dim(line(headers)), ...rows.map(line)].join('\n')
}

/** Format byte size to a short human-readable string. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
