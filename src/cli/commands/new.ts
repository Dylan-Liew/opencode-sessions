import process from "node:process"
import { fail } from "../../lib/errors.js"
import { runOpencode } from "../../services/opencode.js"

export function runNewCommand(args: string[]): never {
  const [title, ...promptParts] = args

  if (!title) {
    fail("Missing required title")
  }

  runOpencode(["run", "--title", title, ...promptParts], process.cwd())
}
