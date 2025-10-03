// User-Agent Classification Tool (deterministic-first, cache-backed, optional LLM fallback)
// Input: uniqueUserAgents[]
// Output: Record<userAgent, { isBot, botType?, botName?, confidence }>

import fs from 'node:fs/promises'
import path from 'node:path'

export interface UAClassification {
  isBot: boolean
  botType?: string
  botName?: string
  confidence: number // 0..1
}

export interface BotSignature {
  name?: string
  pattern: string
  category?: string
  purpose?: string
  operator?: string
  source?: string
  confidence?: number
  isRegex?: boolean
}

export interface ClassifierOptions {
  signaturesPath?: string // defaults to test/bot-signatures.json
  cacheMode?: 'file' | 'none'
  cacheFilePath?: string // defaults to test/bot-classifications.cache.json when cacheMode==='file'
  useLLM?: boolean // optional fallback, default false
  llmBatchSize?: number // 100..300
  llmClassifier?: (userAgents: string[]) => Promise<Record<string, UAClassification>>
}

// Built-in quick heuristics for obvious bots (case-insensitive substrings)
const QUICK_BOT_SUBSTRINGS = [
  'bot', 'crawler', 'spider', 'crawl', 'scrape', 'fetch', 'slurp',
  'googlebot', 'bingbot', 'yandex', 'baiduspider', 'duckduckbot', 'semrush', 'ahrefs', 'mj12bot', 'dotbot', 'screaming frog',
  'facebookexternalhit', 'twitterbot', 'whatsapp', 'telegrambot',
  'python-requests', 'curl', 'wget', 'httpclient', 'okhttp', 'libwww-perl', 'java/', 'node-fetch', 'axios',
  'phantomjs', 'headlesschrome', 'puppeteer', 'lighthouse', 'pagespeed', 'gtmetrix',
  'wordpress.com', 'jetpack', 'uptime', 'monitor'
]

function normalizeUA(ua: string | undefined | null): string {
  return (ua || '').trim()
}

function toLower(ua: string): string {
  return ua.toLowerCase()
}

function compileSignatures(signatures: BotSignature[]): Array<{ re: RegExp; sig: BotSignature }> {
  const compiled: Array<{ re: RegExp; sig: BotSignature }> = []
  for (const sig of signatures) {
    try {
      const source = sig.isRegex ? sig.pattern : sig.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(source, 'i')
      compiled.push({ re, sig })
    } catch {
      // skip bad regex
    }
  }
  return compiled
}

async function loadSignatures(signaturesPath?: string): Promise<Array<{ re: RegExp; sig: BotSignature }>> {
  const defaultPath = path.resolve(process.cwd(), 'test/bot-signatures.json')
  const filePath = signaturesPath ? path.resolve(process.cwd(), signaturesPath) : defaultPath
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(raw) as BotSignature[]
    return compileSignatures(json)
  } catch {
    // If file not found or invalid, fall back to minimal signatures
    const fallback: BotSignature[] = [
      { name: 'Googlebot', pattern: 'Googlebot', category: 'search_engine', confidence: 0.99 },
      { name: 'Bingbot', pattern: 'bingbot', category: 'search_engine', confidence: 0.99 },
      { name: 'GPTBot', pattern: 'GPTBot', category: 'ai_training', confidence: 0.99 },
      { name: 'AhrefsBot', pattern: 'AhrefsBot', category: 'seo', confidence: 0.9 },
      { name: 'curl', pattern: 'curl', category: 'script', confidence: 0.9, isRegex: false },
      { name: 'python-requests', pattern: 'python-requests', category: 'script', confidence: 0.9 }
    ]
    return compileSignatures(fallback)
  }
}

// File-backed cache for environments without DB configured
export class FileCache {
  private filePath: string

  constructor(filePath?: string) {
    this.filePath = filePath
      ? path.resolve(process.cwd(), filePath)
      : path.resolve(process.cwd(), 'test/bot-classifications.cache.json')
  }

  private async readAll(): Promise<Record<string, UAClassification & { last_updated?: string }>> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  private async writeAll(data: Record<string, UAClassification & { last_updated?: string }>) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true })
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8')
  }

  async getMany(userAgents: string[]): Promise<Record<string, UAClassification>> {
    const all = await this.readAll()
    const out: Record<string, UAClassification> = {}
    for (const ua of userAgents) {
      if (all[ua]) {
        const { last_updated: _lu, ...rest } = all[ua]
        out[ua] = rest
      }
    }
    return out
  }

  async upsertMany(rows: Record<string, UAClassification>): Promise<void> {
    const all = await this.readAll()
    const now = new Date().toISOString()
    for (const [ua, cls] of Object.entries(rows)) {
      all[ua] = { ...cls, last_updated: now }
    }
    await this.writeAll(all)
  }
}

function classifyWithHeuristics(
  ua: string,
  compiledSignatures: Array<{ re: RegExp; sig: BotSignature }>
): UAClassification | undefined {
  const clean = normalizeUA(ua)
  if (!clean) {
    return { isBot: true, botType: 'unknown', botName: 'empty_ua', confidence: 0.9 }
  }
  const lower = toLower(clean)

  // Quick substring pass
  for (const token of QUICK_BOT_SUBSTRINGS) {
    if (lower.includes(token)) {
      return {
        isBot: true,
        botType: inferTypeFromToken(token),
        botName: inferNameFromToken(token),
        confidence: 0.9
      }
    }
  }

  // Signature regex pass
  for (const { re, sig } of compiledSignatures) {
    if (re.test(clean)) {
      return {
        isBot: true,
        botType: sig.category || 'unknown',
        botName: sig.name || sig.pattern,
        confidence: Math.min(1, Math.max(0, sig.confidence ?? 0.85))
      }
    }
  }

  // Heuristics for headless or suspicious
  if (/headless|phantom|puppeteer|lighthouse|pagespeed|node-fetch|axios|httpclient/i.test(clean)) {
    return { isBot: true, botType: 'headless', botName: undefined, confidence: 0.85 }
  }

  return undefined // unknown/ambiguous
}

function inferTypeFromToken(token: string): string {
  if (token.includes('google') || token.includes('bing') || token.includes('duckduck') || token.includes('baidu') || token.includes('yandex')) {
    return 'search_engine'
  }
  if (token.includes('python') || token.includes('curl') || token.includes('wget') || token.includes('httpclient') || token.includes('okhttp') || token.includes('node') || token.includes('axios')) {
    return 'script'
  }
  if (token.includes('gpt') || token.includes('ai')) return 'ai_training'
  if (token.includes('scream')) return 'seo'
  if (token.includes('monitor') || token.includes('uptime')) return 'monitoring'
  if (token.includes('jetpack') || token.includes('wordpress')) return 'platform'
  return 'bot'
}

function inferNameFromToken(token: string): string | undefined {
  if (token.includes('googlebot')) return 'Googlebot'
  if (token.includes('bingbot')) return 'Bingbot'
  if (token.includes('duckduck')) return 'DuckDuckBot'
  if (token.includes('ahrefs')) return 'AhrefsBot'
  if (token.includes('semrush')) return 'SemrushBot'
  if (token.includes('mj12bot')) return 'MJ12bot'
  if (token.includes('dotbot')) return 'DotBot'
  if (token.includes('gpt')) return 'GPTBot'
  return undefined
}

export async function classifyUserAgents(
  userAgents: string[],
  options: ClassifierOptions = {}
): Promise<Record<string, UAClassification>> {
  const unique = Array.from(new Set(userAgents.map(normalizeUA))).filter(Boolean) as string[]

  // Init cache
  const cache = options.cacheMode === 'file'
    ? new FileCache(options.cacheFilePath)
    : undefined

  const result: Record<string, UAClassification> = {}
  const unknown: string[] = []

  // 1) Cache lookup
  if (cache) {
    const cached = await cache.getMany(unique)
    Object.assign(result, cached)
  }

  // 2) Heuristics
  const compiled = await loadSignatures(options.signaturesPath)
  for (const ua of unique) {
    if (result[ua]) continue
    const heuristic = classifyWithHeuristics(ua, compiled)
    if (heuristic) {
      result[ua] = heuristic
    } else {
      unknown.push(ua)
    }
  }

  // 3) Optional LLM fallback (batched)
  if (options.useLLM && options.llmClassifier && unknown.length > 0) {
    const batchSize = Math.min(Math.max(options.llmBatchSize ?? 200, 50), 500)
    for (let i = 0; i < unknown.length; i += batchSize) {
      const batch = unknown.slice(i, i + batchSize)
      const llmRes = await options.llmClassifier(batch)
      for (const [ua, cls] of Object.entries(llmRes)) {
        result[ua] = cls
      }
    }
  } else {
    // Mark remaining as human with low confidence (can be revisited later)
    for (const ua of unknown) {
      if (!result[ua]) result[ua] = { isBot: false, confidence: 0.4 }
    }
  }

  // 4) Upsert to cache for reuse
  if (cache) {
    await cache.upsertMany(result)
  }

  return result
}
