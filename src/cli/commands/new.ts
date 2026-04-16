import process from "node:process";
import type { CommandModule } from "yargs";
import { fail } from "../../lib/errors.js";
import { runOpencodeWithStatus } from "../../services/opencode.js";
import {
  getLatestSessionForDirectory,
  getLatestSessionForDirectorySince,
  openSessionStore,
  openSessionStoreWritable,
  setSessionTitle,
} from "../../services/sessions.js";

function getLatestSessionId(directory: string): string | undefined {
  const db = openSessionStore();

  try {
    return getLatestSessionForDirectory(db, directory)?.sessionId;
  } finally {
    db.close();
  }
}

function getLatestTouchedSessionId(directory: string, sinceMs: number): string | undefined {
  const db = openSessionStore();

  try {
    return getLatestSessionForDirectorySince(db, directory, sinceMs)?.sessionId;
  } finally {
    db.close();
  }
}

function applySessionTitle(sessionId: string, title: string): void {
  const writeDb = openSessionStoreWritable();

  try {
    setSessionTitle(writeDb, sessionId, title);
  } finally {
    writeDb.close();
  }
}

function resolveNewSessionId(
  directory: string,
  latestBefore: string | undefined,
  startedAtMs: number,
): string | undefined {
  const latestAfter = getLatestSessionId(directory);

  if (latestAfter && latestAfter !== latestBefore) {
    return latestAfter;
  }

  return getLatestTouchedSessionId(directory, startedAtMs);
}

function applyTitleToNewSession(
  directory: string,
  latestBefore: string | undefined,
  title: string,
  startedAtMs: number,
): void {
  const sessionId = resolveNewSessionId(directory, latestBefore, startedAtMs);

  if (!sessionId) {
    process.stderr.write(`Warning: could not determine new session to apply title "${title}".\n`);
    return;
  }

  applySessionTitle(sessionId, title);
}

export function runNewCommand(args: string[]): never {
  const [title, ...promptParts] = args;

  if (!title) {
    fail("Missing required title");
  }

  if (promptParts.length === 0) {
    fail("Missing required prompt. Usage: oc new <title> <prompt...>");
  }

  const directory = process.cwd();
  const latestBefore = getLatestSessionId(directory);
  const startedAtMs = Date.now();
  const prompt = promptParts.join(" ");
  const exitCode = runOpencodeWithStatus(["--prompt", prompt], directory);

  if (exitCode === 0) {
    applyTitleToNewSession(directory, latestBefore, title, startedAtMs);
  }

  process.exit(exitCode);
}

export const newCommand: CommandModule = {
  command: "new <title> <prompt...>",
  describe: "Start a new titled OpenCode session",
  builder: (yargs) =>
    yargs
      .positional("title", {
        describe: "Title to apply to the newly created session",
        type: "string",
      })
      .positional("prompt", {
        describe: "Prompt to send to OpenCode",
        type: "string",
        array: true,
      }),
  handler: (argv) => {
    const { prompt, title } = argv as { prompt?: unknown; title?: unknown };
    const promptParts = Array.isArray(prompt) ? prompt.map(String) : [String(prompt ?? "")];
    runNewCommand([String(title ?? ""), ...promptParts]);
  },
};
