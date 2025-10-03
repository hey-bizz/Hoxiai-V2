#!/usr/bin/env -S node
// Compute bandwidth costs from normalized logs + UA classifications using price_table.json

import fs from 'node:fs/promises'
import path from 'node:path'
import { computeBandwidthCosts } from '../lib/cost-calculator'
import { AggregatorUtils } from '../lib/aggregator'

interface Args {
  provider: string
  normalized: string
  uaMap: string
  windowDays?: number
  region?: string
  netlifyPlan?: 'personal' | 'pro' | 'legacy'
  useArgo?: boolean
}

function parseArgs(argv: string[]): Args {
  const args: any = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--provider' || a === '-p') args.provider = argv[++i]
    else if (a === '--normalized' || a === '-n') args.normalized = argv[++i]
    else if (a === '--ua-map' || a === '-u') args.uaMap = argv[++i]
    else if (a === '--windowDays' || a === '-w') args.windowDays = Number(argv[++i])
    else if (a === '--region' || a === '-r') args.region = argv[++i]
    else if (a === '--netlifyPlan') args.netlifyPlan = argv[++i]
    else if (a === '--useArgo') args.useArgo = true
  }
  if (!args.provider || !args.normalized || !args.uaMap) {
    console.error('Usage: scripts/compute-cost.ts --provider <vercel|aws_cloudfront|netlify|cloudflare> --normalized <normalized.json> --ua-map <ua-classifications.json> [--windowDays <days>] [--region <key>] [--netlifyPlan <personal|pro|legacy>] [--useArgo]')
    process.exit(1)
  }
  return args
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  const absNorm = path.resolve(process.cwd(), a.normalized)
  const absUAMap = path.resolve(process.cwd(), a.uaMap)

  const rawNorm = await fs.readFile(absNorm, 'utf8')
  const norm = JSON.parse(rawNorm) as { metadata?: any; entries: any[] }
  const entries = norm.entries || []

  // Compute window days from metadata if not provided
  let windowDays = a.windowDays
  if (!windowDays && norm.metadata?.timeRange?.start && norm.metadata?.timeRange?.end) {
    const start = Date.parse(norm.metadata.timeRange.start)
    const end = Date.parse(norm.metadata.timeRange.end)
    windowDays = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)))
  }
  if (!windowDays) windowDays = 7

  const rawUAs = await fs.readFile(absUAMap, 'utf8')
  const uaMap = JSON.parse(rawUAs) as Record<string, { isBot?: boolean }>

  // Aggregate breakdowns
  let totalBytes = 0
  let botBytes = 0
  let humanBytes = 0
  const staticBytes = { static: 0, dynamic: 0 }
  const statusBytes: Record<string, number> = {}

  for (const e of entries) {
    const bytes = Number(e.bytes_transferred || 0)
    totalBytes += bytes

    const ua = e.user_agent || ''
    const isBot = uaMap[ua]?.isBot === true
    if (isBot) botBytes += bytes
    else humanBytes += bytes

    const group = AggregatorUtils.pathToGroup(e.path)
    staticBytes[group] += bytes

    const status = String(e.status_code || '0')
    const cls = status[0] + 'xx'
    statusBytes[cls] = (statusBytes[cls] || 0) + bytes
  }

  const breakdown = [
    { category: 'bot', bytes: botBytes },
    { category: 'human', bytes: humanBytes },
    { category: 'static', bytes: staticBytes.static },
    { category: 'dynamic', bytes: staticBytes.dynamic },
    // Add status classes
    ...Object.entries(statusBytes).map(([k, v]) => ({ category: k, bytes: v }))
  ]

  const res = await computeBandwidthCosts({
    provider: a.provider,
    totals: { totalBytes },
    breakdown,
    windowDays,
    options: {
      region: a.region,
      netlifyPlan: a.netlifyPlan,
      useCloudflareArgo: !!a.useArgo
    }
  })

  console.log(JSON.stringify({ windowDays, totalBytes, cost: res }, null, 2))
}

main().catch(err => { console.error('Cost compute failed:', err); process.exit(1) })

