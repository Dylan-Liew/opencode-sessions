import { styleMuted, styleStrong } from "./format.js";

export function formatTable(headers: string[], rows: unknown[][]): string {
  const normalizedRows = rows.map((row) => row.map((value) => String(value ?? "")));
  const widths = headers.map((header, index) => {
    return normalizedRows.reduce(
      (width, row) => Math.max(width, (row[index] || "").length),
      header.length,
    );
  });

  const headerLine = headers
    .map((value, index) => value.padEnd(widths[index]))
    .join("  ")
    .trimEnd();
  const dividerLine = widths.map((width) => "-".repeat(width)).join("  ");
  const rowLines = normalizedRows.map((row) =>
    row
      .map((value, index) => value.padEnd(widths[index]))
      .join("  ")
      .trimEnd(),
  );

  return `${[styleStrong(headerLine), styleMuted(dividerLine), ...rowLines].join("\n")}\n`;
}
