import process from "node:process"

const COLORS_ENABLED = process.stdout.isTTY && !Object.hasOwn(process.env, "NO_COLOR")

export function styleMuted(text: string): string {
  if (!COLORS_ENABLED) {
    return text
  }

  return `\u001b[2m${text}\u001b[0m`
}

export function styleStrong(text: string): string {
  if (!COLORS_ENABLED) {
    return text
  }

  return `\u001b[1m${text}\u001b[0m`
}

export function sanitizeInline(value: unknown): string {
  return String(value ?? "").replace(/[\t\n\r]+/g, " ")
}

export function truncateInline(value: unknown, maxWidth: number): string {
  const text = sanitizeInline(value)

  if (!Number.isFinite(maxWidth) || maxWidth < 4 || text.length <= maxWidth) {
    return text
  }

  return `${text.slice(0, maxWidth - 3)}...`
}

export function printable(value: string, fallback = "<none>"): string {
  return value ? value : fallback
}

export function formatSection(title: string, content: string, options: { colorTitle?: boolean; dividerChar?: string } = {}): string {
  const { colorTitle = true, dividerChar = "-" } = options
  const cleanTitle = sanitizeInline(title)
  const divider = styleMuted(dividerChar.repeat(cleanTitle.length))
  const titleLine = colorTitle ? styleStrong(cleanTitle) : cleanTitle
  return `${titleLine}\n${divider}\n${content}`
}

export function formatKeyValue(items: Array<[string, unknown]>): string {
  const normalizedItems = items.map(([label, value]) => [String(label), String(value ?? "")] as const)
  const labelWidth = normalizedItems.reduce((width, [label]) => Math.max(width, label.length), 0)
  const lines = normalizedItems.map(([label, value]) => `${styleMuted(label.padEnd(labelWidth))}: ${value}`)
  return `${lines.join("\n")}\n`
}
