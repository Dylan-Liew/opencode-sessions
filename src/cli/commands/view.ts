import process from "node:process";
import type { CommandModule } from "yargs";
import { fail } from "../../lib/errors.js";
import { formatKeyValue, formatSection, printable, truncateInline } from "../../output/format.js";
import { formatTable } from "../../output/table.js";
import {
  getRecentTextParts,
  getSession,
  getSessionCounts,
  openSessionStore,
  resolveSessionId,
} from "../../services/sessions.js";

export async function runViewCommand(input: string): Promise<void> {
  const db = openSessionStore();

  try {
    const id = resolveSessionId(db, input, { allowTitle: true });
    const session = getSession(db, id);

    if (!session) {
      fail(`Session not found: ${id}`);
    }

    const counts = getSessionCounts(db, id);
    const recentParts = getRecentTextParts(db, id);
    const textColumnWidth = Math.max(32, (process.stdout.columns || 120) - 35);

    const details = formatKeyValue([
      ["id", session.sessionId],
      ["directory", session.directory],
      ["project", printable(session.projectName)],
      ["worktree", printable(session.worktree)],
      ["parent", printable(session.parentId, "<root>")],
      ["share", printable(session.shareUrl)],
      ["created", session.created],
      ["updated", session.updated],
      ["archived", printable(session.archived, "<no>")],
    ]);

    const activity = formatKeyValue([
      ["title", session.title],
      ["messages", counts.messages],
      ["parts", counts.parts],
      ["todos", counts.todos],
    ]);

    const recentTable = formatTable(
      ["created", "role", "text"],
      recentParts.map((part) => [
        part.created,
        part.role,
        truncateInline(part.text, textColumnWidth),
      ]),
    );

    process.stdout.write(
      `${formatSection("Session Details", details, { colorTitle: false, dividerChar: "=" })}\n` +
        `${formatSection("Activity", activity, { colorTitle: false, dividerChar: "=" })}\n` +
        `${formatSection("Recent Text Parts", recentTable, { colorTitle: false, dividerChar: "=" })}`,
    );
  } finally {
    db.close();
  }
}

export const viewCommand: CommandModule = {
  command: "view <session>",
  aliases: ["v"],
  describe: "Show session metadata and recent text parts",
  builder: (yargs) =>
    yargs.positional("session", {
      describe: "Session ID, unique prefix, or title",
      type: "string",
    }),
  handler: async (argv) => {
    await runViewCommand(String((argv as { session?: unknown }).session ?? ""));
  },
};
