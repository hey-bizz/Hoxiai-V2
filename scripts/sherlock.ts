#!/usr/bin/env -S node
// Sherlock CLI: investigates unknown/ambiguous UAs and enriches cache
// Usage:
//   pnpm tsx scripts/sherlock.ts \
//     --normalized test/<file>.normalized.json \
//     --ua-map test/ua-classifications.json \
//     --out test/ua-classifications.enriched.json

import fs from 'node:fs/promises'
import path from 'node:path'
import { SherlockAI } from '../hoxi-agents/agent/sherlock'

interface Args {
  normalized?: string
  uaMap?: string
  out?: string
}

function parseArgs(argv: string[]): Args {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--normalized' || a === '-n') args.normalized = argv[++i]
    else if (a === '--ua-map' || a === '-u') args.uaMap = argv[++i]
    else if (a === '--out' || a === '-o') args.out = argv[++i]
  }
  if (!args.normalized || !args.uaMap) {
    console.error('Usage: scripts/sherlock.ts --normalized <normalized.json> --ua-map <ua-classifications.json> [--out <enriched.json>]')
    process.exit(1)
  }
  return { normalized: args.normalized, uaMap: args.uaMap, out: args.out }
}

async function main() {
  const { normalized, uaMap, out } = parseArgs(process.argv.slice(2))
  const absUA = path.resolve(process.cwd(), uaMap!)
  const uaRaw = await fs.readFile(absUA, 'utf8')
  const uaMapJson = JSON.parse(uaRaw) as Record<string, { isBot: boolean; confidence: number }>

  // Derive unknowns: not bots and low confidence (<= 0.5)
  const unknown = Object.entries(uaMapJson)
    .filter(([, v]) => v && v.isBot === false && (v.confidence ?? 0) <= 0.5)
    .map(([ua]) => ua)

  console.log(`Sherlock: ${unknown.length} unknown/ambiguous UAs to investigate`)
  if (unknown.length === 0) {
    console.log('Nothing to do. Exiting.')
    return
  }

  const sherlock = new SherlockAI({ normalizedFile: normalized, useWebSearch: true, maxBatch: 50, debug: true })
  const result = await sherlock.run(unknown)

  // Merge back into ua-map
  const merged: Record<string, any> = { ...uaMapJson }
  for (const [ua, d] of Object.entries(result)) {
    merged[ua] = { isBot: d.isBot, botType: d.botType, botName: d.botName, confidence: d.confidence, reasoning: d.reasoning }
  }

  const outPath = out ? path.resolve(process.cwd(), out) : path.resolve(process.cwd(), 'test/ua-classifications.enriched.json')
  await fs.writeFile(outPath, JSON.stringify(merged, null, 2), 'utf8')
  console.log(`Wrote enriched UA map -> ${outPath}`)
}

main().catch(err => {
  console.error('Sherlock failed:', err)
  process.exit(1)
})
