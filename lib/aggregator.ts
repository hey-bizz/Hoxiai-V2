// Aggregator: single-pass compaction over normalized DetectionLogEntry logs
// Emits unique user agents, IP/minute rollups, status rollups, path-group rollups, and totals

import { DetectionLogEntry, NormalizedLogData } from './types'

export type MinuteBucket = number // epoch ms truncated to minute

export interface AggregationTotals {
  totalBytes: number
  totalRequests: number
  startTime?: string
  endTime?: string
}

export interface ByIPMinuteEntry {
  requests: number
  bytes: number
}

export type ByIPMinute = Record<string, Record<MinuteBucket, ByIPMinuteEntry>>

export interface StatusRollupEntry {
  count: number
  bytes: number
}

export type ByStatus = Record<string, StatusRollupEntry>

export type PathGroup = 'static' | 'dynamic'

export interface PathGroupRollupEntry {
  count: number
  bytes: number
}

export type ByPathGroup = Record<PathGroup, PathGroupRollupEntry>

export interface AggregationResult {
  uniqueUserAgents: string[]
  byIPMinute: ByIPMinute
  byStatus: ByStatus
  byPathGroup: ByPathGroup
  totals: AggregationTotals
}

// Static asset extensions (lowercase) considered "static" for grouping
const STATIC_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'css', 'map',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico',
  'woff', 'woff2', 'ttf', 'otf',
  'mp4', 'webm', 'mp3', 'wav',
  'pdf', 'zip', 'gz', 'br', 'txt', 'json', 'xml'
])

function truncateToMinute(ts: string | Date): MinuteBucket {
  const ms = typeof ts === 'string' ? Date.parse(ts) : ts.getTime()
  const minute = Math.floor(ms / 60000) * 60000
  return minute
}

function pathToGroup(path?: string): PathGroup {
  if (!path) return 'dynamic'

  // Strip query string and anchors
  const qIndex = path.indexOf('?')
  const hIndex = path.indexOf('#')
  const cutIndex = Math.min(qIndex === -1 ? path.length : qIndex, hIndex === -1 ? path.length : hIndex)
  const clean = path.slice(0, cutIndex)

  // Extract extension
  const lastSlash = clean.lastIndexOf('/')
  const file = lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean
  const dot = file.lastIndexOf('.')
  if (dot > 0 && dot < file.length - 1) {
    const ext = file.slice(dot + 1).toLowerCase()
    if (STATIC_EXTENSIONS.has(ext)) return 'static'
  }

  // Common explicitly-static files without extension
  if (clean === '/robots.txt' || clean === '/favicon.ico') return 'static'

  return 'dynamic'
}

/**
 * Aggregate a sequence of DetectionLogEntry objects in a single pass.
 * Accepts sync or async iterables for streaming scenarios.
 */
export async function aggregateEntries(
  entries: Iterable<DetectionLogEntry> | AsyncIterable<DetectionLogEntry>
): Promise<AggregationResult> {
  const uaSet = new Set<string>()

  // Using Maps during aggregation for efficiency; convert to plain objects at the end
  const ipMinuteMap = new Map<string, Map<MinuteBucket, ByIPMinuteEntry>>()
  const statusMap = new Map<string, StatusRollupEntry>()
  const pathGroupMap = new Map<PathGroup, PathGroupRollupEntry>([
    ['static', { count: 0, bytes: 0 }],
    ['dynamic', { count: 0, bytes: 0 }]
  ])

  const totals: AggregationTotals = {
    totalBytes: 0,
    totalRequests: 0,
    startTime: undefined,
    endTime: undefined
  }

  const maybeAsync = typeof (entries as any)?.[Symbol.asyncIterator] === 'function'

  // Helper to process a single entry
  const process = (e: DetectionLogEntry) => {
    const bytes = Number(e.bytes_transferred || 0)

    // Unique UAs
    if (e.user_agent) uaSet.add(e.user_agent)

    // IP/minute
    const ip = e.ip_address || 'unknown'
    const minute = truncateToMinute(e.timestamp as unknown as string)
    let minuteMap = ipMinuteMap.get(ip)
    if (!minuteMap) {
      minuteMap = new Map<MinuteBucket, ByIPMinuteEntry>()
      ipMinuteMap.set(ip, minuteMap)
    }
    const current = minuteMap.get(minute) || { requests: 0, bytes: 0 }
    current.requests += 1
    current.bytes += bytes
    minuteMap.set(minute, current)

    // Status rollup
    const statusKey = String(e.status_code || '0')
    const s = statusMap.get(statusKey) || { count: 0, bytes: 0 }
    s.count += 1
    s.bytes += bytes
    statusMap.set(statusKey, s)

    // Path-group rollup
    const group = pathToGroup(e.path)
    const g = pathGroupMap.get(group) || { count: 0, bytes: 0 }
    g.count += 1
    g.bytes += bytes
    pathGroupMap.set(group, g)

    // Totals
    totals.totalRequests += 1
    totals.totalBytes += bytes

    // Time bounds
    const tsStr = typeof e.timestamp === 'string' ? e.timestamp : e.timestamp?.toISOString?.()
    if (tsStr) {
      if (!totals.startTime || tsStr < totals.startTime) totals.startTime = tsStr
      if (!totals.endTime || tsStr > totals.endTime) totals.endTime = tsStr
    }
  }

  if (maybeAsync) {
    for await (const e of entries as AsyncIterable<DetectionLogEntry>) {
      process(e)
    }
  } else {
    for (const e of entries as Iterable<DetectionLogEntry>) {
      process(e)
    }
  }

  // Convert Maps to plain objects for JSON-compatibility
  const byIPMinute: ByIPMinute = {}
  for (const [ip, minuteMap] of ipMinuteMap.entries()) {
    const inner: Record<MinuteBucket, ByIPMinuteEntry> = Object.create(null)
    for (const [minute, value] of minuteMap.entries()) {
      inner[minute] = value
    }
    byIPMinute[ip] = inner
  }

  const byStatus: ByStatus = {}
  for (const [status, value] of statusMap.entries()) {
    byStatus[status] = value
  }

  const byPathGroup: ByPathGroup = {
    static: pathGroupMap.get('static') || { count: 0, bytes: 0 },
    dynamic: pathGroupMap.get('dynamic') || { count: 0, bytes: 0 }
  }

  return {
    uniqueUserAgents: Array.from(uaSet),
    byIPMinute,
    byStatus,
    byPathGroup,
    totals
  }
}

/**
 * Aggregate directly from a NormalizedLogData object
 */
export async function aggregateNormalizedData(data: NormalizedLogData): Promise<AggregationResult> {
  return aggregateEntries(data.entries)
}

/**
 * Aggregate from a normalized JSON file on disk ({ metadata, entries: DetectionLogEntry[] })
 * Note: This implementation reads the file into memory before processing. For very large
 * files, prefer piping parsed entries into aggregateEntries() as an async iterable.
 */
export async function aggregateFromNormalizedFile(filePath: string): Promise<AggregationResult> {
  const fs = await import('fs/promises')
  const raw = await fs.readFile(filePath, 'utf8')
  const json = JSON.parse(raw) as { entries: DetectionLogEntry[] }
  return aggregateEntries(json.entries || [])
}

// Convenience: classify extension for testing or external use
export const AggregatorUtils = {
  truncateToMinute,
  pathToGroup,
  STATIC_EXTENSIONS
}

