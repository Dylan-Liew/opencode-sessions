import process from "node:process";
import { sanitizeInline } from "../../output/format.js";
import { formatTable } from "../../output/table.js";
import { listRootSessions, openSessionStore } from "../../services/sessions.js";

export async function runListCommand(): Promise<void> {
  const db = openSessionStore();

  try {
    const rows = listRootSessions(db);

    if (process.stdout.isTTY) {
      // Lazy-load Ink only when needed for TTY output
      const { renderListInk } = await import("../../output/ink.js");
      process.stdout.write(renderListInk(rows));
      return;
    }

    process.stdout.write(
      formatTable(
        ["id", "updated", "title", "directory"],
        rows.map((row) => [
          row.sessionId.slice(0, 20),
          row.updated,
          sanitizeInline(row.title),
          row.directory,
        ]),
      ),
    );
  } finally {
    db.close();
  }
}
