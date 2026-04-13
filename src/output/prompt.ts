import readline from "node:readline/promises";
import process from "node:process";
import { rankFuzzy } from "../lib/fuzzy.js";

type PromptInkModule = Pick<typeof import("./ink.js"), "confirmInk" | "selectWithSearchInk">;

let promptInkModulePromise: Promise<PromptInkModule> | undefined;

async function loadPromptInkModule(): Promise<PromptInkModule> {
  if (!promptInkModulePromise) {
    promptInkModulePromise = import("./ink.js");
  }

  return promptInkModulePromise;
}

export async function confirm(message: string): Promise<boolean> {
  if (process.stdout.isTTY && process.stdin.isTTY) {
    const { confirmInk } = await loadPromptInkModule();
    return confirmInk(message);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

  try {
    const reply = await rl.question(message);
    return /^(y|yes)$/i.test(reply.trim());
  } finally {
    rl.close();
  }
}

export async function selectIndex(message: string, count: number): Promise<number | null> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

  try {
    while (true) {
      const reply = await rl.question(message);
      const trimmed = reply.trim();

      if (!trimmed) {
        return null;
      }

      const selectedIndex = Number.parseInt(trimmed, 10);

      if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= count) {
        return selectedIndex - 1;
      }

      process.stderr.write(`Invalid selection: ${trimmed}\n`);
    }
  } finally {
    rl.close();
  }
}

export interface SearchChoice {
  label: string;
  detail?: string;
  searchText: string;
}

function renderChoices(choices: SearchChoice[]): string {
  return choices
    .map((choice, index) => {
      const suffix = choice.detail ? `  ${choice.detail}` : "";
      return `${String(index + 1).padStart(2, " ")}. ${choice.label}${suffix}`;
    })
    .join("\n");
}

export async function selectWithSearch(
  choices: SearchChoice[],
  options: { initialPrompt?: string; maxVisible?: number } = {},
): Promise<number | null> {
  if (process.stdout.isTTY && process.stdin.isTTY) {
    const { selectWithSearchInk } = await loadPromptInkModule();
    return selectWithSearchInk(choices, { maxVisible: options.maxVisible });
  }

  const { initialPrompt = "Search (or pick number, Enter cancels): ", maxVisible = 12 } = options;
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const indexedChoices = choices.map((choice, index) => ({ choice, index }));
  let query = "";

  try {
    while (true) {
      const matches = rankFuzzy(
        indexedChoices,
        query,
        ({ choice }) => choice.searchText,
        maxVisible,
      );

      if (matches.length === 0) {
        process.stdout.write(`No matches for "${query}".\n`);
      } else {
        process.stdout.write(`${renderChoices(matches.map((match) => match.item.choice))}\n`);
      }

      const reply = await rl.question(query ? `Search "${query}" (text/#/Enter): ` : initialPrompt);
      const trimmed = reply.trim();

      if (!trimmed) {
        return null;
      }

      const selectedIndex = Number.parseInt(trimmed, 10);

      if (Number.isInteger(selectedIndex)) {
        if (selectedIndex < 1 || selectedIndex > matches.length) {
          process.stderr.write(`Invalid selection: ${trimmed}\n`);
          continue;
        }

        return matches[selectedIndex - 1].item.index;
      }

      query = trimmed;
    }
  } finally {
    rl.close();
  }
}
