#!/usr/bin/env -S node
// Sherlock smoke test: limit unknown UAs to a small subset to validate end-to-end flow.
// Usage:
//   pnpm tsx scripts/sherlock_smoke.ts \
//     --normalized test/<file>.normalized.json \
//     --ua-map test/ua-classifications.json \
//     --out test/ua-classifications.enriched.json \
//     [--limit 10] [--no-web]

import fs from 'node:fs/promises'
import path from 'node:path'
import { SherlockAI } from '../hoxi-agents/agent/sherlock'

interface Args { normalized?: string; uaMap?: string; out?: string; limit?: number; noWeb?: boolean }

function parseArgs(argv: string[]): Args {
  const args: Record<string, any> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--normalized' || a === '-n') args.normalized = argv[++i]
    else if (a === '--ua-map' || a === '-u') args.uaMap = argv[++i]
    else if (a === '--out' || a === '-o') args.out = argv[++i]
    else if (a === '--limit' || a === '-l') args.limit = Number(argv[++i])
    else if (a === '--no-web') args.noWeb = true
  }
  if (!args.normalized || !args.uaMap) {
    console.error('Usage: scripts/sherlock_smoke.ts --normalized <normalized.json> --ua-map <ua-classifications.json> [--out <enriched.json>] [--limit <N>] [--no-web]')
    process.exit(1)
  }
  return args
}

async function main() {
  const { normalized, uaMap, out, limit = 10, noWeb = false } = parseArgs(process.argv.slice(2))
  const absUA = path.resolve(process.cwd(), uaMap!)
  const uaRaw = await fs.readFile(absUA, 'utf8')
  const uaMapJson = JSON.parse(uaRaw) as Record<string, { isBot?: boolean; confidence?: number }>

  // Unknowns = not bots with low/medium confidence (<=0.5)
  const unknownAll = Object.entries(uaMapJson)
    .filter(([, v]) => v && v.isBot === false && (v.confidence ?? 0) <= 0.5)
    .map(([ua]) => ua)

  const unknown = unknownAll.slice(0, Math.max(1, limit))
  console.log(`Sherlock smoke: investigating ${unknown.length}/${unknownAll.length} unknown/ambiguous UAs`)
  if (unknown.length === 0) {
    console.log('Nothing to do. Exiting.')
    return
  }

  const sherlock = new SherlockAI({ normalizedFile: normalized, useWebSearch: !noWeb, maxBatch: Math.min(unknown.length, 20), debug: true })
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

main().catch(err => { console.error('Sherlock smoke failed:', err); process.exit(1) })
