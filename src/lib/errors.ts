export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function fail(message: string, exitCode = 1): never {
  throw new CliError(message, exitCode);
}
