import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { main as runMain } from "./app.js";

export { buildCli, getCompletionCandidates, main } from "./app.js";

const isDirectExecution = (() => {
  const entrypoint = process.argv[1];

  if (!entrypoint) {
    return false;
  }

  return fileURLToPath(import.meta.url) === path.resolve(entrypoint);
})();

if (isDirectExecution) {
  runMain().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
