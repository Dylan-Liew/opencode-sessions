import fs from "node:fs"
import process from "node:process"
import { fail } from "../../lib/errors.js"
import { sanitizeInline } from "../../output/format.js"
import { selectIndex } from "../../output/prompt.js"
import { formatTable } from "../../output/table.js"
import { runOpencode } from "../../services/opencode.js"
import { getSessionDirectory, listRootSessionsForDirectory, openSessionStore, resolveSessionId } from "../../services/sessions.js"

function ensureSessionDirectory(id: string, directory: string): void {
  if (!directory) {
    fail(`No directory found for session: ${id}`)
  }

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    fail(`Session directory does not exist: ${directory}`)
  }
}

async function resolveResumeIdFromCurrentDirectory(): Promise<string> {
  const db = openSessionStore()

  try {
    const sessions = listRootSessionsForDirectory(db, process.cwd())

    if (sessions.length === 0) {
      fail(`No root sessions found for current directory: ${process.cwd()}`)
    }

    if (sessions.length === 1) {
      return sessions[0].sessionId
    }

    process.stdout.write("Multiple sessions found for this directory:\n")
    process.stdout.write(formatTable(
      ["#", "updated", "title", "id"],
      sessions.map((session, index) => [String(index + 1), session.updated, sanitizeInline(session.title), session.sessionId]),
    ))

    const selectedIndex = await selectIndex(`Select session [1-${sessions.length}] or press Enter to cancel: `, sessions.length)

    if (selectedIndex === null) {
      fail("Cancelled.")
    }

    return sessions[selectedIndex].sessionId
  } finally {
    db.close()
  }
}

export async function runResumeCommand(input?: string): Promise<void> {
  const resolvedId = input
    ? (() => {
        const db = openSessionStore()

        try {
          return resolveSessionId(db, input, { allowTitle: true })
        } finally {
          db.close()
        }
      })()
    : await resolveResumeIdFromCurrentDirectory()

  const db = openSessionStore()

  try {
    const directory = getSessionDirectory(db, resolvedId)
    ensureSessionDirectory(resolvedId, directory)
    runOpencode(["-s", resolvedId], directory)
  } finally {
    db.close()
  }
}
