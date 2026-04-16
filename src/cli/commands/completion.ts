import process from "node:process";
import type { CommandModule } from "yargs";
import { getCompletionCandidates } from "../app.js";
import { renderFishCompletionScript } from "../completion/fish.js";
import { fail } from "../../lib/errors.js";

function normalizeTokens(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((part) => String(part));
}

export const completionCommand: CommandModule = {
  command: "completion <shell>",
  aliases: ["completions"],
  describe: "Print a shell completion script",
  builder: (yargs) =>
    yargs.positional("shell", {
      describe: "Shell name",
      type: "string",
    }),
  handler: (argv) => {
    const shell = String((argv as { shell?: unknown }).shell ?? "");

    if (shell !== "fish") {
      fail(`Unsupported shell: ${shell}. Only fish is supported today.`);
    }

    process.stdout.write(renderFishCompletionScript());
  },
};

export const completeCommand: CommandModule = {
  command: "__complete [tokens...]",
  describe: false,
  builder: (yargs) =>
    yargs.positional("tokens", {
      type: "string",
      array: true,
      hidden: true,
    }),
  handler: async (argv) => {
    const completions = await getCompletionCandidates(
      normalizeTokens((argv as { tokens?: unknown }).tokens),
    );

    if (completions.length > 0) {
      process.stdout.write(`${completions.join("\n")}\n`);
    }
  },
};
