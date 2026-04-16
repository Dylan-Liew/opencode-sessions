import fs from "node:fs";
import type { CommandModule } from "yargs";
import { fail } from "../../lib/errors.js";
import { resolveSessionIdInteractively } from "../session-picker.js";
import { confirm } from "../../output/prompt.js";
import { runOpencode } from "../../services/opencode.js";
import { getSession, openSessionStore } from "../../services/sessions.js";

function ensureSessionDirectory(id: string, directory: string): void {
  if (!directory) {
    fail(`No directory found for session: ${id}`);
  }

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    fail(`Session directory does not exist: ${directory}`);
  }
}

async function resolveDeleteSessionId(
  db: ReturnType<typeof openSessionStore>,
  input: string,
): Promise<string> {
  return resolveSessionIdInteractively(db, input, { allowTitle: true });
}

export async function runDeleteCommand(input: string): Promise<void> {
  const db = openSessionStore();

  try {
    const id = await resolveDeleteSessionId(db, input);
    const session = getSession(db, id);

    if (!session) {
      fail(`Session not found: ${id}`);
    }

    const directory = session.directory || session.worktree;
    ensureSessionDirectory(id, directory);

    if (!(await confirm(`Delete session "${session.title}" (${session.sessionId})? [y/N] `))) {
      fail("Cancelled.");
    }

    db.close();
    runOpencode(["session", "delete", session.sessionId], directory);
  } finally {
    if (db.open) {
      db.close();
    }
  }
}

export const deleteCommand: CommandModule = {
  command: "delete <session>",
  aliases: ["d"],
  describe: "Delete the session via opencode after confirmation",
  builder: (yargs) =>
    yargs.positional("session", {
      describe: "Session ID, unique prefix, or title",
      type: "string",
    }),
  handler: async (argv) => {
    await runDeleteCommand(String((argv as { session?: unknown }).session ?? ""));
  },
};
