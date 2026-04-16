import { spawnSync } from "node:child_process";
import process from "node:process";
import { fail } from "../lib/errors.js";

function failForSpawnError(error: Error): never {
  if ("code" in error && error.code === "ENOENT") {
    fail("Missing required command: opencode");
  }

  fail(`Failed to run opencode: ${error.message}`);
}

export function ensureOpencodeAvailable(): void {
  const result = spawnSync("opencode", ["--version"], {
    stdio: "ignore",
  });

  if (result.error || result.status !== 0) {
    fail("Missing required command: opencode");
  }
}

export function readOpencode(parts: string[]): string {
  const result = spawnSync("opencode", parts, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    failForSpawnError(result.error);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    fail(`Failed to run opencode: ${stderr || `exit code ${result.status}`}`);
  }

  return (result.stdout || "").trim();
}

export function runOpencodeWithStatus(parts: string[], cwd: string): number {
  const result = spawnSync("opencode", parts, {
    cwd,
    stdio: "inherit",
  });

  if (result.error) {
    failForSpawnError(result.error);
  }

  return result.status ?? 1;
}

export function runOpencode(parts: string[], cwd: string): never {
  process.exit(runOpencodeWithStatus(parts, cwd));
}
