import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import process from "node:process";

const repoRoot = "/home/william/projects/temp/oc-sessions";
const builtCliPath = "./dist/cli/index.js";

function runCli(args: string[]) {
  return spawnSync(process.execPath, [builtCliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

describe("oc CLI", () => {
  test("shows help output with completion command", () => {
    const result = runCli(["--help"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("oc <command>");
    expect(result.stdout).toContain("completion");
    expect(result.stdout).toContain("resume");
  });

  test("prints fish completion script", () => {
    const result = runCli(["completion", "fish"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("complete -c oc -f");
    expect(result.stdout).toContain("oc __complete");
  });

  test("rejects unknown commands", () => {
    const result = runCli(["wat"]);
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(output).toContain("Did you mean");
  });
});
