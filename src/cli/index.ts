import process from "node:process";
import { fail } from "../lib/errors.js";

const USAGE = `Usage:
  oc new <title> [prompt...]
  oc list
  oc view <session>
  oc resume [session]
  oc delete <session>

Commands:
  new       Start a new titled OpenCode session
  list, ls  List root sessions across all projects
  view, v   Show session metadata and recent text parts from SQLite
  resume, r Launch opencode in the session directory
  delete, d Delete the session via opencode after confirmation
`;

function printUsage(): void {
  process.stdout.write(USAGE);
}

function usageError(): never {
  printUsage();
  process.exit(1);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command, ...rest] = argv;

  if (!command) {
    usageError();
  }

  switch (command) {
    case "new":
      if (rest.length < 1) {
        usageError();
      }

      const { runNewCommand } = await import("./commands/new.js");
      runNewCommand(rest);
      return;
    case "list":
    case "ls":
      if (rest.length !== 0) {
        usageError();
      }

      const { runListCommand } = await import("./commands/list.js");
      await runListCommand();
      return;
    case "view":
    case "v":
      if (rest.length !== 1) {
        usageError();
      }

      const { runViewCommand } = await import("./commands/view.js");
      await runViewCommand(rest[0]);
      return;
    case "resume":
    case "r":
      if (rest.length > 1) {
        usageError();
      }

      const { runResumeCommand } = await import("./commands/resume.js");
      await runResumeCommand(rest[0]);
      return;
    case "delete":
    case "d":
      if (rest.length !== 1) {
        usageError();
      }

      const { runDeleteCommand } = await import("./commands/delete.js");
      await runDeleteCommand(rest[0]);
      return;
    case "help":
    case "-h":
    case "--help":
      printUsage();
      return;
    default:
      fail(`Unknown command: ${command}\n\n${USAGE}`);
  }
}
