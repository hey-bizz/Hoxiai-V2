#!/usr/bin/env -S node
// Analyzer CLI: orchestrates end-to-end analysis and upserts report
// Usage:
//   pnpm tsx scripts/analyzer.ts \
//     --site <site-id> \
//     --provider <vercel|aws|netlify|cloudflare> \
//     --normalized test/<file>.normalized.json \
//     [--aggregates test/<file>.aggregates.json] \
//     [--use-web] [--max-web 20]

import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs/promises'
import { analyze } from '../hoxi-agents/agent/analyzer'

interface Args {
  site?: string
  provider?: 'vercel' | 'aws' | 'netlify' | 'cloudflare'
  normalized?: string
  aggregates?: string
  useWeb?: boolean
  maxWeb?: number
  start?: string
  end?: string
}

function parseArgs(argv: string[]): Args {
  const args: any = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--site') args.site = argv[++i]
    else if (a === '--provider') args.provider = argv[++i]
    else if (a === '--normalized' || a === '-n') args.normalized = argv[++i]
    else if (a === '--aggregates' || a === '-a') args.aggregates = argv[++i]
    else if (a === '--use-web') args.useWeb = true
    else if (a === '--max-web') args.maxWeb = Number(argv[++i])
    else if (a === '--start') args.start = argv[++i]
    else if (a === '--end') args.end = argv[++i]
  }
  if (!args.site || !args.provider || !args.normalized) {
    console.error('Usage: scripts/analyzer.ts --site <site-id> --provider <vercel|aws|netlify|cloudflare> --normalized <normalized.json> [--aggregates <aggregates.json>] [--start ISO] [--end ISO] [--use-web] [--max-web <N>]')
    process.exit(1)
  }
  return args
}

async function inferWindow(normalizedPath: string, fallbackStart?: string, fallbackEnd?: string) {
  const abs = path.resolve(process.cwd(), normalizedPath)
  const raw = await fs.readFile(abs, 'utf8')
  const json = JSON.parse(raw)
  const start = fallbackStart || json?.metadata?.timeRange?.start || new Date().toISOString()
  const end = fallbackEnd || json?.metadata?.timeRange?.end || new Date().toISOString()
  return { start, end }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const window = await inferWindow(args.normalized!, args.start, args.end)

  const report = await analyze({
    siteId: args.site!,
    provider: (args.provider === 'aws' ? 'aws' : (args.provider as any)),
    window,
    dataRef: { normalizedPath: args.normalized!, aggregatesPath: args.aggregates },
    options: { useWebSearch: !!args.useWeb, maxSherlockWeb: args.maxWeb ?? 20 }
  })

  console.log(JSON.stringify({ reportId: report.reportId, summary: report.metrics, classifications: report.classifications, notes: report.notes }, null, 2))
}

main().catch(err => { console.error('Analyzer failed:', err); process.exit(1) })

