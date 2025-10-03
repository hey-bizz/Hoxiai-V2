#!/usr/bin/env -S node
// CLI to classify user agents using deterministic heuristics + file cache.
// Usage: pnpm tsx scripts/classify-ua.ts --in <aggregates.json|normalized.json> --out <out.json>

import fs from 'node:fs/promises'
import path from 'node:path'
import { classifyUserAgents } from '../lib/ua-classifier'

interface Args { in: string; out?: string }

function parseArgs(argv: string[]): Args {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--in' || a === '-i') args.in = argv[++i]
    else if (a === '--out' || a === '-o') args.out = argv[++i]
  }
  if (!args.in) {
    console.error('Usage: scripts/classify-ua.ts --in <aggregates.json|normalized.json> [--out <ua-classifications.json>]')
    process.exit(1)
  }
  return { in: args.in, out: args.out }
}

async function loadUserAgents(inputPath: string): Promise<string[]> {
  const raw = await fs.readFile(inputPath, 'utf8')
  const json = JSON.parse(raw)
  if (Array.isArray(json.uniqueUserAgents)) return json.uniqueUserAgents
  if (Array.isArray(json.entries)) {
    const set = new Set<string>()
    for (const e of json.entries) {
      if (e && typeof e.user_agent === 'string' && e.user_agent) {
        set.add(e.user_agent)
      }
    }
    return Array.from(set)
  }
  throw new Error('Unsupported input JSON shape: expected { uniqueUserAgents } or { entries }')
}

async function main() {
  const { in: inPath, out } = parseArgs(process.argv.slice(2))
  const absIn = path.resolve(process.cwd(), inPath)
  const userAgents = await loadUserAgents(absIn)
  console.log(`Loaded ${userAgents.length} unique user agents from ${absIn}`)

  const classifications = await classifyUserAgents(userAgents, {
    signaturesPath: 'test/bot-signatures.json',
    cacheMode: 'file',
    cacheFilePath: 'test/bot-classifications.cache.json',
    useLLM: false
  })

  const output = JSON.stringify(classifications, null, 2)
  const outPath = out ? path.resolve(process.cwd(), out) : path.resolve(process.cwd(), 'test/ua-classifications.json')
  await fs.writeFile(outPath, output, 'utf8')
  console.log(`Wrote UA classifications -> ${outPath}`)
}

main().catch(err => {
  console.error('UA classification failed:', err)
  process.exit(1)
})

