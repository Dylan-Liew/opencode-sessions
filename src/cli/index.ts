import process from "node:process"
import { fail } from "../lib/errors.js"
import { ensureOpencodeAvailable } from "../services/opencode.js"
import { runDeleteCommand } from "./commands/delete.js"
import { runListCommand } from "./commands/list.js"
import { runNewCommand } from "./commands/new.js"
import { runResumeCommand } from "./commands/resume.js"
import { runViewCommand } from "./commands/view.js"

const USAGE = `Usage:
  oc new <title> [prompt...]
  oc list
  oc ls
  oc view <session>
  oc v <session>
  oc resume [session]
  oc r [session]
  oc delete <session>
  oc d <session>

Commands:
  new       Start a new titled OpenCode session
  list, ls  List root sessions across all projects
  view, v   Show session metadata and recent text parts from SQLite
  resume, r Launch opencode in the session directory
  delete, d Delete the session via opencode after confirmation
`

function printUsage(): void {
  process.stdout.write(USAGE)
}

function usageError(): never {
  printUsage()
  process.exit(1)
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  ensureOpencodeAvailable()

  const [command, ...rest] = argv

  if (!command) {
    usageError()
  }

  switch (command) {
    case "new":
      if (rest.length < 1) {
        usageError()
      }

      runNewCommand(rest)
      return
    case "list":
    case "ls":
      if (rest.length !== 0) {
        usageError()
      }

      runListCommand()
      return
    case "view":
    case "v":
      if (rest.length !== 1) {
        usageError()
      }

      runViewCommand(rest[0])
      return
    case "resume":
    case "r":
      if (rest.length > 1) {
        usageError()
      }

      await runResumeCommand(rest[0])
      return
    case "delete":
    case "d":
      if (rest.length !== 1) {
        usageError()
      }

      await runDeleteCommand(rest[0])
      return
    case "help":
    case "-h":
    case "--help":
      printUsage()
      return
    default:
      fail(`Unknown command: ${command}\n\n${USAGE}`)
  }
}
