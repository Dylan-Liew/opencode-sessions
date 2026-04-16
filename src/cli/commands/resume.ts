import fs from "node:fs";
import process from "node:process";
import type { CommandModule } from "yargs";
import { fail } from "../../lib/errors.js";
import { resolveSessionIdInteractively, selectSessionId } from "../session-picker.js";
import { runOpencode } from "../../services/opencode.js";
import {
  getSessionDirectory,
  listRootSessionsForDirectory,
  openSessionStore,
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

    return selectSessionId(sessions, { intro: `Multiple sessions found for ${process.cwd()}.` });
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
    ? await (async () => {
        const db = openSessionStore();

        try {
          return resolveSessionIdInteractively(db, input, { allowTitle: true });
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
