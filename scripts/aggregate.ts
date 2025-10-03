#!/usr/bin/env -S node
// CLI to aggregate normalized log JSON using lib/aggregator
// Usage: pnpm tsx scripts/aggregate.ts --in <input.json> --out <output.json>

import { aggregateFromNormalizedFile } from '../lib/aggregator'
import fs from 'node:fs/promises'
import path from 'node:path'

interface Args {
  in: string
  out?: string
}

function parseArgs(argv: string[]): Args {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--in' || a === '-i') args.in = argv[++i]
    else if (a === '--out' || a === '-o') args.out = argv[++i]
  }
  if (!args.in) {
    console.error('Usage: scripts/aggregate.ts --in <normalized.json> [--out <aggregates.json>]')
    process.exit(1)
  }
  return { in: args.in, out: args.out }
}

async function main() {
  const { in: inputFile, out } = parseArgs(process.argv.slice(2))

  const absIn = path.resolve(process.cwd(), inputFile)
  console.log(`Aggregating: ${absIn}`)

  const result = await aggregateFromNormalizedFile(absIn)

  const output = JSON.stringify(result, null, 2)

  if (out) {
    const absOut = path.resolve(process.cwd(), out)
    await fs.writeFile(absOut, output, 'utf8')
    console.log(`Wrote aggregates -> ${absOut}`)
  } else {
    process.stdout.write(output)
  }
}

main().catch(err => {
  console.error('Aggregation failed:', err)
  process.exit(1)
})

