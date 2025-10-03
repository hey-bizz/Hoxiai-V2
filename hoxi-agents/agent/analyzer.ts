// Analyzer Orchestrator: end-to-end analysis + report upsert
// Wires UA classifier, Sherlock, anomaly tool, and cost calculator.

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { classifyUserAgents, FileCache, UAClassification } from '../../lib/ua-classifier'
import { SherlockAI } from './sherlock'
import { anomalyDetectionTool } from '../tools/anomaly-detection.tool'
import { computeBandwidthCosts } from '../../lib/cost-calculator'
import { aggregateEntries, aggregateFromNormalizedFile } from '../../lib/aggregator'
import type { DetectionLogEntry } from '../../lib/types'
import { upsertAnalysisReport, getPriceTableVersion } from '../../lib/db'
import { supabaseAdmin } from '../../src/lib/supabase'

export type ProviderKey = 'aws' | 'cloudflare' | 'vercel' | 'netlify'

export interface AnalyzeInput {
  orgId?: string
  siteId: string
  provider: ProviderKey
  window: { start: string; end: string }
  dataRef: {
    uniqueUserAgents?: string[]
    aggregatesPath?: string
    normalizedPath?: string
    db?: { orgId: string; siteId: string; start: string; end: string }
  }
  options?: {
    useWebSearch?: boolean
    maxSherlockWeb?: number
    cacheFilePath?: string
    debug?: boolean
  }
}

export interface AnalysisReport {
  reportId: string
  orgId?: string
  siteId: string
  window: { start: string; end: string }
  provider: string
  versions: {
    pricing: string
    signatures?: string
    sherlock: string
    tools: Record<string, string>
  }
  metrics: {
    bytes: { total: number; bot: number; human: number }
    cost: { totalUSD: number; botUSD: number; humanUSD: number; breakdown: Array<{ category: string; usd: number }> }
  }
  classifications: {
    sampleSize: number
    bots: number
    humans: number
    unknown: number
    examples: Array<{ ua: string; isBot: boolean; botType?: string; confidence: number }>
  }
  anomalies: Array<{ type: string; score?: number; ip?: string; path?: string; evidence?: any; note?: string }>
  notes: string[]
  createdAt: string
}

export async function analyze(input: AnalyzeInput): Promise<AnalysisReport> {
  const { orgId, siteId, provider, window, dataRef, options } = input
  const notes: string[] = []
  const createdAt = new Date().toISOString()
  const reportOrgId = orgId || dataRef.db?.orgId

  // Load aggregates or compute from normalized
  let aggregates: Awaited<ReturnType<typeof aggregateFromNormalizedFile>> | undefined
  let normalizedEntries: DetectionLogEntry[] | undefined
  let normalizedMeta: any | undefined

  try {
    if (dataRef.aggregatesPath) {
      const abs = path.resolve(process.cwd(), dataRef.aggregatesPath)
      const raw = await fs.readFile(abs, 'utf8')
      aggregates = JSON.parse(raw)
    }
  } catch (err: any) {
    notes.push(`Failed to read aggregates: ${err?.message || String(err)}`)
  }

  // Option: load from DB window (normalized_entries)
  try {
    if (!aggregates && dataRef.db) {
      if (!supabaseAdmin) throw new Error('supabase admin not initialized')
      const { orgId, siteId, start, end } = dataRef.db
      const { data, error } = await supabaseAdmin
        .from('normalized_entries')
        .select('ts, ip, ua, method, path, status, bytes, referer')
        .eq('org_id', orgId)
        .eq('site_id', siteId)
        .gte('ts', start)
        .lte('ts', end)
        .order('ts', { ascending: true })
      if (error) throw error
      const entries = (data || []).map((r: any) => ({
        timestamp: r.ts,
        ip_address: r.ip || undefined,
        user_agent: r.ua || undefined,
        method: r.method || undefined,
        path: r.path || undefined,
        status_code: r.status ?? undefined,
        bytes_transferred: r.bytes ?? 0,
        referer: r.referer || undefined
      })) as any as DetectionLogEntry[]
      normalizedEntries = entries
      aggregates = await aggregateEntries(entries)
      normalizedMeta = { timeRange: { start, end } }
    }
  } catch (err: any) {
    notes.push(`Failed to load from DB: ${err?.message || String(err)}`)
  }

  // If no aggregates available, derive from normalized
  try {
    if (!aggregates) {
      const normalizedPath = dataRef.normalizedPath
      if (!normalizedPath) throw new Error('normalizedPath is required when aggregatesPath is not provided')
      const absNorm = path.resolve(process.cwd(), normalizedPath)
      const raw = await fs.readFile(absNorm, 'utf8')
      const norm = JSON.parse(raw) as { metadata?: any; entries: DetectionLogEntry[] }
      normalizedEntries = norm.entries || []
      normalizedMeta = norm.metadata
      aggregates = await aggregateFromNormalizedFile(absNorm)
    }
  } catch (err: any) {
    notes.push(`Failed to load/aggregate normalized logs: ${err?.message || String(err)}`)
    throw err
  }

  const uaList = Array.from(new Set(
    (dataRef.uniqueUserAgents || aggregates?.uniqueUserAgents || []) as string[]
  ))

  // UA classification (deterministic-first)
  const cache = new FileCache(options?.cacheFilePath)
  let baseLabels: Record<string, UAClassification> = {}
  try {
    baseLabels = await classifyUserAgents(uaList, {
      cacheMode: 'file',
      cacheFilePath: options?.cacheFilePath,
      signaturesPath: 'test/bot-signatures.json',
      useLLM: false
    })
  } catch (err: any) {
    notes.push(`UA classification failed: ${err?.message || String(err)}`)
  }

  const unknownUAs = uaList.filter(ua => !baseLabels[ua] || (baseLabels[ua].confidence ?? 0) < 0.65)

  // Sherlock for edge cases
  let sherlockLabels: Record<string, UAClassification & { reasoning?: string }> = {}
  if (unknownUAs.length) {
    try {
      const sherlock = new SherlockAI({
        normalizedFile: dataRef.normalizedPath,
        useWebSearch: !!options?.useWebSearch,
        maxBatch: 50,
        debug: !!options?.debug
      })
      const res = await sherlock.run(unknownUAs)
      for (const [ua, d] of Object.entries(res)) {
        sherlockLabels[ua] = { isBot: d.isBot, botType: d.botType, botName: d.botName, confidence: d.confidence, reasoning: d.reasoning }
      }
      // Persist updated decisions to file cache
      await cache.upsertMany(Object.fromEntries(Object.entries(sherlockLabels).map(([ua, d]) => [ua, d as UAClassification])))
    } catch (err: any) {
      notes.push(`Sherlock run failed: ${err?.message || String(err)}`)
    }
  }

  const finalLabels: Record<string, UAClassification & { reasoning?: string }> = { ...baseLabels, ...sherlockLabels }

  // Anomaly detection (deterministic)
  let anomalies: Array<{ type: string; ip?: string; score?: number; evidence?: any }> = []
  try {
    const res: any = await anomalyDetectionTool.execute?.({ byIPMinute: aggregates?.byIPMinute || {} }, { toolCallId: 'analyzer-anomalies', messages: [] })
    anomalies = (res?.anomalies || []).slice(0, 50)
  } catch (err: any) {
    notes.push(`Anomaly detection failed: ${err?.message || String(err)}`)
  }

  // Cost breakdown (bytes-by-category from normalized entries)
  let totalBytes = 0
  let botBytes = 0
  let humanBytes = 0
  const statusBytes: Record<string, number> = {}
  const staticDynamic = { static: 0, dynamic: 0 }

  try {
    if (!normalizedEntries) {
      // If we started from aggregatesPath, load normalized file too for breakdown accuracy
      const np = dataRef.normalizedPath
      if (np) {
        const absNorm = path.resolve(process.cwd(), np)
        const raw = await fs.readFile(absNorm, 'utf8')
        const norm = JSON.parse(raw) as { entries: DetectionLogEntry[]; metadata?: any }
        normalizedEntries = norm.entries || []
        normalizedMeta = norm.metadata
      } else {
        throw new Error('normalizedPath is required to compute cost breakdowns')
      }
    }
    for (const e of normalizedEntries!) {
      const bytes = Number((e as any).bytes_transferred || 0)
      totalBytes += bytes
      const ua = (e as any).user_agent || ''
      const isBot = finalLabels[ua]?.isBot === true
      if (isBot) botBytes += bytes
      else humanBytes += bytes
      const pathStr = (e as any).path || ''
      const group = pathStr && /\.(?:js|mjs|cjs|css|map|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf|zip|gz|br|txt|json|xml)(?:\?|#|$)/i.test(pathStr) || pathStr === '/robots.txt' || pathStr === '/favicon.ico' ? 'static' : 'dynamic'
      staticDynamic[group as 'static' | 'dynamic'] += bytes
      const status = String((e as any).status_code || '0')
      const cls = status[0] + 'xx'
      statusBytes[cls] = (statusBytes[cls] || 0) + bytes
    }
  } catch (err: any) {
    notes.push(`Cost breakdown pass failed: ${err?.message || String(err)}`)
  }

  const windowDays = diffDays(window.start, window.end) || inferWindowDaysFromMeta(normalizedMeta) || 7
  const breakdown = [
    { category: 'bot', bytes: botBytes },
    { category: 'human', bytes: humanBytes },
    { category: 'static', bytes: staticDynamic.static },
    { category: 'dynamic', bytes: staticDynamic.dynamic },
    ...Object.entries(statusBytes).map(([category, bytes]) => ({ category, bytes }))
  ]

  const cost = await computeBandwidthCosts({
    provider,
    totals: { totalBytes },
    breakdown,
    windowDays
  })

  // Versions
  const pricingVersion = await getPriceTableVersion().catch(() => 'unknown')
  const versions = {
    pricing: pricingVersion,
    signatures: 'bot-signatures.json',
    sherlock: 'v1',
    tools: {
      'anomaly-detection': 'v1',
      'web-search': 'exa-js'
    }
  }

  const sampleExamples = Object.entries(finalLabels).slice(0, 10).map(([ua, d]) => ({ ua, isBot: !!d.isBot, botType: d.botType, confidence: d.confidence }))
  const counts = countLabels(finalLabels)

  const reportId = makeReportId({ siteId, provider, window, pricingVersion })
  const report: AnalysisReport = {
    reportId,
    orgId: reportOrgId,
    siteId,
    window,
    provider,
    versions,
    metrics: {
      bytes: { total: totalBytes, bot: botBytes, human: humanBytes },
      cost: {
        totalUSD: cost.totalCost,
        botUSD: sumUSD(cost.breakdown, 'bot'),
        humanUSD: sumUSD(cost.breakdown, 'human'),
        breakdown: cost.breakdown.map(b => ({ category: b.category, usd: b.monthlyCost }))
      }
    },
    classifications: {
      sampleSize: uaList.length,
      bots: counts.bots,
      humans: counts.humans,
      unknown: counts.unknown,
      examples: sampleExamples
    },
    anomalies: anomalies as any,
    notes,
    createdAt
  }

  // Upsert into DB (best-effort)
  try {
    await upsertAnalysisReport(report)
  } catch (err: any) {
    notes.push(`DB upsert failed: ${err?.message || String(err)}`)
  }

  return report
}

export function makeReportId({ siteId, provider, window, pricingVersion }: { siteId: string; provider: string; window: { start: string; end: string }; pricingVersion?: string }) {
  const h = crypto.createHash('sha256')
  h.update([siteId, provider, window.start, window.end, pricingVersion || ''].join('|'))
  return h.digest('hex').slice(0, 32)
}

function diffDays(a?: string, b?: string) {
  if (!a || !b) return 0
  const ms = Math.abs(Date.parse(b) - Date.parse(a))
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

function inferWindowDaysFromMeta(meta?: any) {
  const s = meta?.timeRange?.start
  const e = meta?.timeRange?.end
  return diffDays(s, e)
}

function countLabels(map: Record<string, UAClassification>) {
  let bots = 0, humans = 0, unknown = 0
  for (const v of Object.values(map)) {
    if (typeof v?.isBot === 'boolean') {
      if (v.isBot) bots++
      else humans++
    } else unknown++
  }
  return { bots, humans, unknown }
}

function sumUSD(items: Array<{ category: string; monthlyCost: number }>, category: string) {
  return Math.round(items.filter(i => i.category === category).reduce((s, it) => s + it.monthlyCost, 0) * 100) / 100
}
