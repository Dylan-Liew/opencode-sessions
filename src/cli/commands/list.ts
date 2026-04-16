import type { CommandModule } from "yargs";
import { sanitizeInline } from "../../output/format.js";
import { formatTable } from "../../output/table.js";
import { listRootSessions, openSessionStore } from "../../services/sessions.js";

export function runListCommand(): void {
  const db = openSessionStore();

  try {
    const rows = listRootSessions(db);
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

export const listCommand: CommandModule = {
  command: "list",
  aliases: ["ls"],
  describe: "List root sessions across all projects",
  handler: () => {
    runListCommand();
  },
};
