import fs from "node:fs"
import { fail } from "../../lib/errors.js"
import { confirm } from "../../output/prompt.js"
import { runOpencode } from "../../services/opencode.js"
import { getSession, openSessionStore, resolveSessionId } from "../../services/sessions.js"

function ensureSessionDirectory(id: string, directory: string): void {
  if (!directory) {
    fail(`No directory found for session: ${id}`)
  }

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    fail(`Session directory does not exist: ${directory}`)
  }
}

export async function runDeleteCommand(input: string): Promise<void> {
  const db = openSessionStore()

  try {
    const id = resolveSessionId(db, input, { allowTitle: true })
    const session = getSession(db, id)

    if (!session) {
      fail(`Session not found: ${id}`)
    }

    const directory = session.directory || session.worktree
    ensureSessionDirectory(id, directory)

    if (!(await confirm(`Delete session "${session.title}" (${session.sessionId})? [y/N] `))) {
      fail("Cancelled.")
    }

    db.close()
    runOpencode(["session", "delete", session.sessionId], directory)
  } finally {
    if (db.open) {
      db.close()
    }
  }
}
