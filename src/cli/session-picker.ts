import process from "node:process";
import { fail } from "../lib/errors.js";
import { sanitizeInline } from "../output/format.js";
import { selectWithSearch } from "../output/prompt.js";
import { resolveSession, type RootSession, type SessionDatabase } from "../services/sessions.js";

interface SelectSessionOptions {
  intro?: string;
}

export function failForMissingSession(
  input: string,
  suggestions: Array<{ sessionId: string; title: string }>,
): never {
  if (suggestions.length > 0) {
    fail(
      `! Session not found: ${input}\n\n` +
        `Closest matches:\n${suggestions.map((row) => `${row.sessionId}\t${row.title}`).join("\n")}`,
    );
  }

  fail(`! Session not found: ${input}`);
}

export async function resolveSessionIdInteractively(
  db: SessionDatabase,
  input: string,
  options: { allowTitle?: boolean } = {},
): Promise<string> {
  const resolution = resolveSession(db, input, options);

  if (resolution.kind === "resolved") {
    return resolution.sessionId;
  }

  if (resolution.kind === "ambiguous") {
    return selectSessionId(resolution.matches);
  }

  return failForMissingSession(input, resolution.suggestions);
}

export async function selectSessionId(
  sessions: RootSession[],
  options: SelectSessionOptions = {},
): Promise<string> {
  const { intro } = options;

  if (sessions.length === 0) {
    fail("No matching sessions found.");
  }

  if (sessions.length === 1) {
    return sessions[0].sessionId;
  }

  if (intro) {
    process.stdout.write(`${intro}\n\n`);
  }

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
}
