import { Command } from 'commander'
import {
  runCheck,
  type CheckIssue,
  type CheckReport,
  type CheckSeverity,
} from '../../engine/check/index.js'
import { EXIT } from '../error.js'
import { formatSize, mark, style } from '../output.js'
import { action } from '../run.js'

export const checkCommand = new Command('check')
  .description('Check posts, images, links and config without building')
  .option('--base-path <path>', 'path the blog is served under, if not the one in blog.json')
  .addHelpText(
    'after',
    `
Checks frontmatter, MDX syntax, components, images, internal links, tag spelling,
missing translations and sizes against the hosted build limits.

Exit codes: 0 no problems, 1 errors found, 2 warnings only.`,
  )
  .action(
    action(async (_ctx, flags: { basePath?: string }) => {
      const report = await runCheck(process.cwd(), { basePath: flags.basePath })
      const exitCode =
        report.summary.errors > 0
          ? EXIT.error
          : report.summary.warnings > 0
            ? EXIT.warnings
            : EXIT.ok
      return { data: report, render: renderReport, exitCode }
    }),
  )

const SEVERITY_MARK: Record<CheckSeverity, () => string> = {
  error: mark.error,
  warning: mark.warn,
  info: mark.info,
}

function renderIssue(issue: CheckIssue): string[] {
  const line = issue.line ? style.dim(String(issue.line).padStart(4)) : '    '
  const lines = [
    `  ${SEVERITY_MARK[issue.severity]()} ${line}  ${issue.message}  ${style.dim(issue.rule)}`,
  ]
  for (const detail of issue.details ?? []) lines.push(`          ${style.dim('·')} ${detail}`)
  if (issue.hint) lines.push(`          ${style.cyan('→')} ${issue.hint}`)
  return lines
}

export function renderReport(report: CheckReport): string {
  const out: string[] = ['']
  const byFile = new Map<string, CheckIssue[]>()
  for (const issue of report.issues) {
    const key = issue.file ?? ''
    byFile.set(key, [...(byFile.get(key) ?? []), issue])
  }

  for (const [file, issues] of byFile) {
    out.push(`  ${style.bold(file || 'Project')}`)
    for (const issue of issues) out.push(...renderIssue(issue))
    out.push('')
  }

  const { errors, warnings, info } = report.summary
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const counts = [
    errors > 0 ? style.red(plural(errors, 'error')) : '0 errors',
    warnings > 0 ? style.yellow(plural(warnings, 'warning')) : '0 warnings',
    plural(info, 'note'),
  ]
  const scope = `${plural(report.posts, 'post')}${report.drafts ? ` + ${plural(report.drafts, 'draft')}` : ''}, ${report.languages.join('/')}, ${formatSize(report.sourceBytes)} of content and assets`
  const status = report.passed ? `${mark.ok()} Check passed` : `${mark.error()} Check failed`
  out.push(`  ${status}: ${counts.join(', ')}`)
  out.push(`  ${style.dim(scope)}`)
  out.push('')
  return out.join('\n')
}
