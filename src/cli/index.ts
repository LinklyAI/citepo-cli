import { Command } from 'commander'
import { getVersion } from './utils.js'
import { newCommand } from './commands/new.js'
import { devCommand } from './commands/dev.js'
import { buildCommand } from './commands/build.js'
import { checkForUpdates } from './version-check.js'

const program = new Command()

const version = await getVersion()

program
  .name('citepo')
  .description('A lightweight CLI for creating, previewing, and building blogs')
  .version(version, '-v, --version')

// Register commands
program.addCommand(newCommand)
program.addCommand(devCommand)
program.addCommand(buildCommand)

program.addHelpText(
  'after',
  `
Upgrade:
  npm install -g citepo@latest
`,
)

// Fire-and-forget background version check
checkForUpdates()

program.parse()
