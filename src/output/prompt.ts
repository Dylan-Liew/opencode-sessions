import readline from "node:readline/promises"
import process from "node:process"

export async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })

  try {
    const reply = await rl.question(message)
    return /^(y|yes)$/i.test(reply.trim())
  } finally {
    rl.close()
  }
}

export async function selectIndex(message: string, count: number): Promise<number | null> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr })

  try {
    while (true) {
      const reply = await rl.question(message)
      const trimmed = reply.trim()

      if (!trimmed) {
        return null
      }

      const selectedIndex = Number.parseInt(trimmed, 10)

      if (Number.isInteger(selectedIndex) && selectedIndex >= 1 && selectedIndex <= count) {
        return selectedIndex - 1
      }

      process.stderr.write(`Invalid selection: ${trimmed}\n`)
    }
  } finally {
    rl.close()
  }
}
