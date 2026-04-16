import fs from "node:fs";
import process from "node:process";
import type { CommandModule } from "yargs";
import { fail } from "../../lib/errors.js";
import { sanitizeInline } from "../../output/format.js";
import { selectWithSearch } from "../../output/prompt.js";
import { runOpencode } from "../../services/opencode.js";
import {
  getSessionDirectory,
  listRootSessionsForDirectory,
  openSessionStore,
  resolveSessionId,
} from "../../services/sessions.js";

function ensureSessionDirectory(id: string, directory: string): void {
  if (!directory) {
    fail(`No directory found for session: ${id}`);
  }

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    fail(`Session directory does not exist: ${directory}`);
  }
}

async function resolveResumeIdFromCurrentDirectory(): Promise<string> {
  const db = openSessionStore();

  try {
    const sessions = listRootSessionsForDirectory(db, process.cwd());

    if (sessions.length === 0) {
      fail(`No root sessions found for current directory: ${process.cwd()}`);
    }

    if (sessions.length === 1) {
      return sessions[0].sessionId;
    }

    process.stdout.write(`Multiple sessions found for ${process.cwd()}.\n`);
    process.stdout.write("\n");
    const selectedIndex = await selectWithSearch(
      sessions.map((session) => ({
        label: `${sanitizeInline(session.title)} (${session.sessionId.slice(0, 12)})`,
        detail: session.updated,
        searchText: `${session.title} ${session.sessionId} ${session.directory}`,
      })),
      { initialPrompt: "Search by title/id, then enter result number (Enter cancels): " },
    );

    if (selectedIndex === null) {
      fail("Cancelled.");
    }

    return sessions[selectedIndex].sessionId;
  } finally {
    db.close();
  }
}

export const resumeCommand: CommandModule = {
  command: "resume [session]",
  aliases: ["r"],
  describe: "Launch opencode in the session directory",
  builder: (yargs) =>
    yargs.positional("session", {
      describe: "Session ID, unique prefix, or title",
      type: "string",
    }),
  handler: async (argv) => {
    const session = (argv as { session?: unknown }).session;
    await runResumeCommand(typeof session === "string" ? session : undefined);
  },
};

export async function runResumeCommand(input?: string): Promise<void> {
  const resolvedId = input
    ? (() => {
        const db = openSessionStore();

        try {
          return resolveSessionId(db, input, { allowTitle: true });
        } finally {
          db.close();
        }
      })()
    : await resolveResumeIdFromCurrentDirectory();

  const db = openSessionStore();

  try {
    const directory = getSessionDirectory(db, resolvedId);
    ensureSessionDirectory(resolvedId, directory);
    runOpencode(["-s", resolvedId], directory);
  } finally {
    db.close();
  }
}
