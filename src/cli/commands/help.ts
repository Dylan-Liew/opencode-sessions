import type { CommandModule } from "yargs";
import { showHelpForArgs } from "../app.js";

export const helpCommand: CommandModule = {
  command: "help",
  describe: "Show CLI help",
  handler: async () => {
    await showHelpForArgs([]);
  },
};
