// Sherlock AI Agent (Vercel AI SDK)
// Model: gpt-4o-mini; uses system prompt and web-search tool

import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import fs from 'node:fs/promises'
import path from 'node:path'
import { SHERLOCK_SYSTEM_PROMPT } from '../prompts/sherlock.prompt'
import { webSearch } from '../tools/web-search.tool'
import { anomalyDetectionTool } from '../tools/anomaly-detection.tool'
import { FileCache, UAClassification } from '../../lib/ua-classifier'
import type { DetectionLogEntry } from '../../lib/types'

export interface SherlockRunOptions {
  normalizedFile?: string
  entries?: DetectionLogEntry[]
  maxBatch?: number
  useWebSearch?: boolean
  webResultsPerUA?: number
  cacheFilePath?: string
  debug?: boolean
}

export interface SherlockLLMDecision extends UAClassification {
  reasoning: string
}

export class SherlockAI {
  private model = openai('gpt-5-nano')
  private cache: FileCache

  constructor(private readonly config: SherlockRunOptions = {}) {
    this.cache = new FileCache(config.cacheFilePath)
  }

  async loadEntries(): Promise<DetectionLogEntry[]> {
    if (this.config.entries?.length) return this.config.entries
    if (!this.config.normalizedFile) throw new Error('SherlockAI: normalizedFile or entries is required')
    const abs = path.resolve(process.cwd(), this.config.normalizedFile)
    const raw = await fs.readFile(abs, 'utf8')
    const json = JSON.parse(raw) as { entries: DetectionLogEntry[] }
    return json.entries || []
  }

  private computeFeatures(entries: DetectionLogEntry[], ualist: string[]) {
    const targets = new Set(ualist)
    const perUAMinute = new Map<string, Map<number, number>>()
    const perUAStatus = new Map<string, { fourxx: number; total: number }>()
    const perUAIPs = new Map<string, Set<string>>()
    const perUATotals = new Map<string, { bytes: number; total: number; start?: string; end?: string }>()
    const perIPMinute = new Map<string, Map<number, { requests: number; bytes: number }>>()
    const ipStatus = new Map<string, { total: number; fourxx: number; fivexx: number; notFound404: number }>()

    const toMinute = (ts: string | Date) => {
      const ms = typeof ts === 'string' ? Date.parse(ts) : ts.getTime()
      return Math.floor(ms / 60000) * 60000
    }

    for (const e of entries) {
      const ua = (e as any).user_agent as string | undefined
      if (!ua || !targets.has(ua)) continue
      const m = toMinute((e as any).timestamp as any)
      let mm = perUAMinute.get(ua)
      if (!mm) { mm = new Map(); perUAMinute.set(ua, mm) }
      mm.set(m, (mm.get(m) || 0) + 1)

      const st = String((e as any).status_code || '0')
      const rec = perUAStatus.get(ua) || { fourxx: 0, total: 0 }
      rec.total += 1
      if (st.startsWith('4')) rec.fourxx += 1
      perUAStatus.set(ua, rec)

      const ip = (e as any).ip_address || 'unknown'
      let ipSet = perUAIPs.get(ua)
      if (!ipSet) { ipSet = new Set(); perUAIPs.set(ua, ipSet) }
      ipSet.add(ip)

      const tRec = perUATotals.get(ua) || { bytes: 0, total: 0, start: undefined, end: undefined }
      const tsVal: any = (e as any).timestamp
      const tsStr = typeof tsVal === 'string' ? tsVal : (tsVal && typeof tsVal.toISOString === 'function' ? tsVal.toISOString() : undefined)
      if (tsStr) {
        if (!tRec.start || tsStr < tRec.start) tRec.start = tsStr
        if (!tRec.end || tsStr > tRec.end) tRec.end = tsStr
      }
      tRec.bytes += Number((e as any).bytes_transferred || 0)
      tRec.total += 1
      perUATotals.set(ua, tRec)

      // Per-IP minute series
      let ipMap = perIPMinute.get(ip)
      if (!ipMap) { ipMap = new Map(); perIPMinute.set(ip, ipMap) }
      const cur = ipMap.get(m) || { requests: 0, bytes: 0 }
      cur.requests += 1
      cur.bytes += Number((e as any).bytes_transferred || 0)
      ipMap.set(m, cur)

      // Per-IP status aggregation
      const stRec = ipStatus.get(ip) || { total: 0, fourxx: 0, fivexx: 0, notFound404: 0 }
      stRec.total += 1
      if (st.startsWith('4')) stRec.fourxx += 1
      if (st.startsWith('5')) stRec.fivexx += 1
      if (st === '404') stRec.notFound404 += 1
      ipStatus.set(ip, stRec)
    }

    const featureMap: Record<string, any> = {}
    for (const ua of ualist) {
      const mm = perUAMinute.get(ua) || new Map<number, number>()
      const series = Array.from(mm.values())
      const minutesObserved = series.length
      const totalReq = perUATotals.get(ua)?.total || 0
      const totalBytes = perUATotals.get(ua)?.bytes || 0
      const ips = perUAIPs.get(ua)?.size || 0
      const fourxx = perUAStatus.get(ua)?.fourxx || 0
      const total = perUAStatus.get(ua)?.total || 0
      const fourxxRate = total > 0 ? fourxx / total : 0
      const mean = series.length ? series.reduce((a, b) => a + b, 0) / series.length : 0
      const variance = series.length ? series.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / series.length : 0
      const std = Math.sqrt(variance)
      const max = series.length ? Math.max(...series) : 0
      const burstZ = std > 0 ? (max - mean) / std : 0
      const tRec = perUATotals.get(ua)

      featureMap[ua] = {
        totalRequests: totalReq,
        totalBytes,
        uniqueIPs: ips,
        minutesObserved,
        reqPerMinMean: round2(mean),
        reqPerMinStd: round2(std),
        reqPerMinMax: max,
        burstZ: round2(burstZ),
        fourxxRate: round2(fourxxRate),
        timeStart: tRec?.start,
        timeEnd: tRec?.end
      }
    }
    // Convert per-IP maps to plain objects for anomaly tool
    const byIPMinute: Record<string, Record<number, { requests: number; bytes: number }>> = {}
    for (const [ip, mm] of perIPMinute.entries()) {
      const obj: Record<number, { requests: number; bytes: number }> = {}
      for (const [minute, val] of mm.entries()) obj[minute] = val
      byIPMinute[ip] = obj
    }
    const ipStatusObj: Record<string, { total: number; fourxx: number; fivexx: number; notFound404: number }> = {}
    for (const [ip, st] of ipStatus.entries()) ipStatusObj[ip] = st

    return { featureMap, byIPMinute, ipStatus: ipStatusObj, perUAIPs }
  }

  async run(unknownUserAgents: string[]): Promise<Record<string, SherlockLLMDecision>> {
    if (!unknownUserAgents?.length) return {}
    const entries = await this.loadEntries()
    const { featureMap: featuresMap, byIPMinute, ipStatus, perUAIPs } = this.computeFeatures(entries, unknownUserAgents)

    // Pre-run anomaly detection and attach hints per UA (non-blocking)
    try {
      const res: any = await anomalyDetectionTool.execute?.({ byIPMinute, ipStatus })
      const anomalies: any[] = res?.anomalies || []
      if (this.config.debug) {
        console.log(`Sherlock anomaly pre-scan: anomalies=${anomalies.length}`)
      }
      if (anomalies.length) {
        const anomalyIPs = new Set<string>(anomalies.map(a => a.ip).filter(Boolean))
        for (const ua of unknownUserAgents) {
          const ips = Array.from(perUAIPs.get(ua) || new Set<string>())
          const hitIPs = ips.filter(ip => anomalyIPs.has(ip))
          if (hitIPs.length) {
            const types = Array.from(new Set(anomalies.filter(a => hitIPs.includes(a.ip)).map((a: any) => a.type)))
            (featuresMap as any)[ua].hasAnomaly = true
            ;(featuresMap as any)[ua].anomalyTypes = types
          }
        }
      }
    } catch {}

    // Stage 1: fast LLM pass without tools. Ask the model to rely only on features
    // and return an additional needs_web flag when more evidence would help.
    const firstPass = await this.classifyWithoutWeb(unknownUserAgents, featuresMap)

    // Select candidates for web search
    const candidates = this.selectForWeb(firstPass, featuresMap)
    if (this.config.debug) {
      console.log(`Sherlock shortlist for web: ${candidates.length}/${unknownUserAgents.length}`)
    }

    // Stage 2: optional web-enabled refinement only for shortlisted UAs
    const refined = candidates.length > 0 && this.config.useWebSearch
      ? await this.classifyWithWeb(candidates, featuresMap, { byIPMinute, ipStatus, perUAIPs })
      : {}

    // Merge results (refined overrides first pass)
    const out: Record<string, SherlockLLMDecision> = {}
    for (const ua of unknownUserAgents) {
      const r = (refined as any)[ua] || (firstPass as any)[ua]
      if (r) out[ua] = r
    }

    // Persist cache
    const toCache: Record<string, UAClassification> = {}
    for (const [ua, d] of Object.entries(out)) {
      toCache[ua] = { isBot: d.isBot, botType: d.botType, botName: d.botName, confidence: d.confidence }
    }
    await this.cache.upsertMany(toCache)

    return out
  }

  private async classifyWithoutWeb(batchAll: string[], features: Record<string, any>) {
    const batchSize = Math.min(Math.max(this.config.maxBatch ?? 50, 10), 100)
    const out: Record<string, SherlockLLMDecision & { needs_web?: boolean }> = {}
    for (let i = 0; i < batchAll.length; i += batchSize) {
      const batch = batchAll.slice(i, i + batchSize)
      const items = batch.map(ua => ({ ua, features: this.pickFeatures(features[ua]) }))
      
      const prompt = `Classify these User-Agents based ONLY on the provided behavioral features. DO NOT call any tools.
Return JSON keyed by UA with: { isBot, botType?, botName?, confidence, reasoning, needs_web?: boolean }.
Mark needs_web true if additional web evidence would substantially improve confidence.
Items:\n${JSON.stringify(items)}`
      if (this.config.debug) {
        console.log(`Sherlock fast pass start: ${i}/${batchAll.length} size=${batch.length}`)
      }
      const { text } = await generateText({
        model: this.model,
        system: SHERLOCK_SYSTEM_PROMPT,
        prompt,
        responseFormat: { type: 'json' as any },
        experimental_telemetry: { isEnabled: true, functionId: 'sherlock.fast' }
      })
      const parsed = safeParseJSON(text)
      if (parsed && typeof parsed === 'object') {
        Object.assign(out, parsed)
      }
    }
    return out
  }

private async classifyWithWeb(
    batchAll: string[],
    features: Record<string, any>,
    _context?: { byIPMinute: Record<string, any>; ipStatus: Record<string, any>; perUAIPs: Map<string, Set<string>> }
  ) {
    const batchSize = Math.min(Math.max(this.config.maxBatch ?? 10, 1), 50)
    const out: Record<string, SherlockLLMDecision> = {}
    for (let i = 0; i < batchAll.length; i += batchSize) {
      const batch = batchAll.slice(i, i + batchSize)
      const items = batch.map(ua => ({ ua, features: this.pickFeatures(features[ua]) }))
      const prompt = `Refine classification for these User-Agents. Prefer deterministic signals; call tools only if needed.
Return JSON keyed by UA with: { isBot, botType?, botName?, confidence, reasoning }.
Items:
${JSON.stringify(items)}`
      if (this.config.debug) {
        console.log(`Sherlock web pass start: ${i}/${batchAll.length} size=${batch.length}`)
      }
      const { text, steps } = await generateText({
        model: this.model,
        system: SHERLOCK_SYSTEM_PROMPT,
        prompt: prompt,
        tools: { webSearch, anomalyDetectionTool },
        responseFormat: { type: 'json' as any },
        experimental_telemetry: { isEnabled: true, functionId: 'sherlock.web' },
        onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
          if (!this.config.debug) return
          console.log(`Sherlock web step: reason=${finishReason} calls=${toolCalls?.length ?? 0} results=${toolResults?.length ?? 0}`)
        }
      })
      if (this.config.debug) {
        console.log(`Sherlock web pass end: steps=${steps?.length ?? 0}`)
      }
      const parsed = safeParseJSON(text)
      if (parsed && typeof parsed === 'object') {
        Object.assign(out, parsed)
      }
    }
    return out
  }

  private selectForWeb(
    firstPass: Record<string, SherlockLLMDecision & { needs_web?: boolean }> ,
    features: Record<string, any>
  ): string[] {
    const threshold = 0.7
    const items = Object.entries(firstPass)
      .filter(([ua, res]) => {
        const f = features[ua] || {}
        return (res as any)?.needs_web === true || ((res?.confidence ?? 0) < threshold) || !!f?.hasAnomaly
      })
      .map(([ua]) => ua)
    return items.slice(0, 20)
  }

  private suspicionScore(f: any): number {
    let s = 0
    if (!f) return s
    // Burstiness
    if (f.burstZ >= 3) s += 30
    else if (f.burstZ >= 2) s += 15
    // 4xx rate
    if (f.fourxxRate >= 0.6) s += 40
    else if (f.fourxxRate >= 0.3) s += 20
    // Throughput
    if (f.reqPerMinMean >= 5) s += 20
    if (f.reqPerMinMax >= 20) s += 10
    // IP diversity
    if (f.uniqueIPs >= 5) s += 10
    // Bound 0..100
    return Math.max(0, Math.min(100, Math.round(s)))
  }

  private pickFeatures(f: any) {
    if (!f) return f
    const {
      totalRequests,
      totalBytes,
      uniqueIPs,
      minutesObserved,
      reqPerMinMean,
      reqPerMinStd,
      reqPerMinMax,
      burstZ,
      fourxxRate,
      timeStart,
      timeEnd,
      hasAnomaly,
      anomalyTypes
    } = f
    return {
      totalRequests,
      totalBytes,
      uniqueIPs,
      minutesObserved,
      reqPerMinMean,
      reqPerMinStd,
      reqPerMinMax,
      burstZ,
      fourxxRate,
      hasAnomaly: !!hasAnomaly,
      anomalyTypes: Array.isArray(anomalyTypes) ? anomalyTypes.slice(0, 5) : undefined,
      timeStart,
      timeEnd,
      suspicion: this.suspicionScore(f)
    }
  }

  private buildPrompt(batch: string[], features: Record<string, any>) {
    const items = batch.map(ua => ({ ua, features: this.pickFeatures(features[ua]) }))
    return `Classify these User-Agents. You may call the webSearch tool if needed to find authoritative references.
For each UA, output a JSON object keyed by the UA string with values { isBot, botType?, botName?, confidence, reasoning }.
Items:\n${JSON.stringify(items)}`
  }
}

function round2(n: number) { return Math.round(n * 100) / 100 }
function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }
function safeParseJSON(s: string) { try { return JSON.parse(s) } catch { return null } }
