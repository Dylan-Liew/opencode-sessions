import process from "node:process";
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

    if (process.stdout.isTTY) {
      // Lazy-load Ink only when needed for TTY output
      const { renderViewInk } = await import("../../output/ink.js");
      process.stdout.write(renderViewInk(session, counts, recentParts));
      return;
    }

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
