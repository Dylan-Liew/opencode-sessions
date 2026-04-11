import { execFileSync, spawnSync } from "node:child_process"
import process from "node:process"
import { fail } from "../lib/errors.js"

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function shell(): string {
  return process.env.SHELL || "/bin/sh"
}

function commandString(parts: string[]): string {
  return parts.map(shellQuote).join(" ")
}

export function ensureOpencodeAvailable(): void {
  const result = spawnSync(shell(), ["-lc", "command -v opencode >/dev/null 2>&1"], {
    stdio: "ignore",
  })

  if (result.status !== 0) {
    fail("Missing required command: opencode")
  }
}

export function readOpencode(parts: string[]): string {
  try {
    return execFileSync(shell(), ["-lc", commandString(parts)], {
      encoding: "utf8",
    }).trim()
  } catch (error) {
    fail(`Failed to run opencode: ${(error as Error).message}`)
  }
}

export function runOpencode(parts: string[], cwd: string): never {
  const result = spawnSync(shell(), ["-lc", commandString(["opencode", ...parts])], {
    cwd,
    stdio: "inherit",
  })

  if (result.error) {
    fail(`Failed to run opencode: ${result.error.message}`)
  }

  process.exit(result.status ?? 1)
}
