import { Command } from 'commander'
import { getVersion } from './utils.js'
import { initCommand } from './commands/init.js'
import { devCommand } from './commands/dev.js'
import { buildCommand } from './commands/build.js'
import { checkCommand } from './commands/check.js'
import { postCommand } from './commands/post.js'
import { tagCommand } from './commands/tag.js'
import { imageCommand } from './commands/image.js'
import { docsCommand } from './commands/docs.js'
import { upgradeCommand } from './commands/upgrade.js'
import { doctorCommand } from './commands/doctor.js'
import { skillCommand } from './commands/skill.js'
import { printJson } from './run.js'

const program = new Command()

const version = await getVersion()
const jsonRequested = process.argv.includes('--json')

program
  .name('citepo')
  .description('A lightweight CLI for creating, previewing, and building blogs')
  .version(version, '-v, --version')
  .option('--json', 'print one JSON document on stdout instead of human-readable output')
  .showHelpAfterError(!jsonRequested)
  .configureOutput({
    // Usage errors (unknown option, missing argument) follow the same JSON contract
    outputError: (message, write) => {
      if (!jsonRequested) return write(message)
      printJson({
        ok: false,
        error: { code: 'usage_error', message: message.replace(/^error: /, '').trim() },
      })
    },
  })

// Commands are grouped by object (`citepo <object> <action>`); the most frequent ones stay top-level
for (const command of [
  initCommand,
  devCommand,
  buildCommand,
  checkCommand,
  postCommand,
  tagCommand,
  imageCommand,
  docsCommand,
  upgradeCommand,
  skillCommand,
  doctorCommand,
]) {
  program.addCommand(inheritSettings(command, program))
}

program.addHelpText(
  'after',
  `
Every command accepts --json for machine-readable output.
Exit codes: 0 success, 1 error, 2 warnings only.`,
)

// `citepo --json` with no command would print help text; keep the JSON contract
const commandArgs = process.argv.slice(2).filter((arg) => arg !== '--json')
if (jsonRequested && commandArgs.length === 0) {
  printJson({
    ok: false,
    error: {
      code: 'usage_error',
      message: 'No command given',
      hint: 'Run `citepo --help` to list commands, e.g. `citepo check --json`.',
    },
  })
  process.exitCode = 1
} else {
  await program.parseAsync()
}

/** addCommand() does not copy output settings, so apply them to the whole command tree. */
function inheritSettings(command: Command, parent: Command): Command {
  command.copyInheritedSettings(parent)
  for (const sub of command.commands) inheritSettings(sub, command)
  return command
}
