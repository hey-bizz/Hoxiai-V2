import { tool } from 'ai'
import { z } from 'zod'

// Input schema: aggregated features for anomaly detection
// - byIPMinute: { [ip]: { [minuteEpochMs]: { requests, bytes? } } }
// - ipStatus (optional): { [ip]: { total, fourxx?, fivexx?, notFound404? } }
// - params (optional): thresholds to tune sensitivity
const minuteEntrySchema = z.object({
  requests: z.number(),
  bytes: z.number().optional()
})

const inputSchema = z.object({
  byIPMinute: z.record(z.string(), z.record(z.string(), minuteEntrySchema)),
  ipStatus: z.record(
    z.string(),
    z.object({
      total: z.number(),
      fourxx: z.number().optional(),
      fivexx: z.number().optional(),
      notFound404: z.number().optional()
    })
  ).optional(),
  ignoreIPs: z.array(z.string()).optional(),
  params: z.object({
    minMinutes: z.number().min(1).optional(),
    zScoreThreshold: z.number().min(0).optional(),
    minMaxRequests: z.number().min(1).optional(),
    burstMultiplier: z.number().min(1).optional(),
    burstMinRequests: z.number().min(1).optional(),
    minTotalRequests: z.number().min(1).optional(),
    high4xxRate: z.number().min(0).max(1).optional(),
    high5xxRate: z.number().min(0).max(1).optional(),
    high404Rate: z.number().min(0).max(1).optional(),
    bytesPerRequestHeavy: z.number().min(0).optional(),
    steadyMeanMin: z.number().min(0).optional(),
    steadyCvMax: z.number().min(0).optional()
  }).optional()
})

type MinuteEntry = z.infer<typeof minuteEntrySchema>

// Default detection parameters
const DEFAULT_PARAMS = {
  minMinutes: 3,
  zScoreThreshold: 3.0,
  minMaxRequests: 200,
  burstMultiplier: 5,
  burstMinRequests: 300,
  minTotalRequests: 100,
  high4xxRate: 0.5,
  high5xxRate: 0.2,
  high404Rate: 0.3,
  bytesPerRequestHeavy: 1_000_000, // 1 MB/req
  steadyMeanMin: 5,
  steadyCvMax: 0.2
}

// Helpers
function mean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stddev(values: number[]) {
  if (values.length < 2) return 0
  const m = mean(values)
  const v = mean(values.map(v => (v - m) ** 2))
  return Math.sqrt(v)
}

function median(values: number[]) {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function trimmedMean(values: number[], trimFraction = 0.1) {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const k = Math.floor(s.length * trimFraction)
  const trimmed = s.slice(k, s.length - k)
  if (!trimmed.length) return mean(s)
  return mean(trimmed)
}

function topSamples(series: Array<{ minute: number; requests: number; bytes: number }>, n = 5) {
  return [...series].sort((a, b) => b.requests - a.requests).slice(0, n)
}

function sum(arr: number[]) { return arr.reduce((a, b) => a + b, 0) }

export const anomalyDetectionTool = tool({
  description: 'Detects suspicious per-IP traffic patterns (bursts, high error rates, bytes-heavy, steady scraping) from aggregated features.',
  inputSchema,
  execute: async ({ byIPMinute, ipStatus, ignoreIPs, params }) => {
    const P = { ...DEFAULT_PARAMS, ...(params || {}) }
    const ignore = new Set(ignoreIPs || [])

    const anomalies: any[] = []
    const ips = Object.keys(byIPMinute || {})
    let analyzed = 0

    for (const ip of ips) {
      if (ignore.has(ip)) continue
      const minutesMap = byIPMinute[ip]
      if (!minutesMap) continue

      // Normalize series to array of { minute, requests, bytes }
      const series = Object.entries(minutesMap).map(([minuteStr, v]: [string, MinuteEntry]) => ({
        minute: Number(minuteStr),
        requests: Number(v?.requests || 0),
        bytes: Number(v?.bytes || 0)
      }))

      if (!series.length) continue
      analyzed += 1

      // Basic aggregates
      const reqSeries = series.map(s => s.requests)
      const bytesSeries = series.map(s => s.bytes)
      const minutesObserved = series.length
      const totalRequests = sum(reqSeries)
      const totalBytes = sum(bytesSeries)
      const maxReq = Math.max(...reqSeries)
      const meanReq = mean(reqSeries)
      const stdReq = stddev(reqSeries)
      const cvReq = meanReq > 0 ? stdReq / meanReq : 0
      const maxPoint = series.reduce((best, s) => (s.requests > best.requests ? s : best), series[0])
      const samples = topSamples(series)

      // Z-score for the maximum minute
      const zScore = stdReq > 0 ? (maxReq - meanReq) / stdReq : 0

      // Baseline via robust mean/median
      const baseMedian = median(reqSeries)
      const baseTrimmed = trimmedMean(reqSeries, 0.1)
      const baseline = Math.max(1, Math.round((baseMedian + baseTrimmed + meanReq) / 3))
      const burstRatio = baseline > 0 ? maxReq / baseline : maxReq

      // 1) High request rate (spike)
      if (
        minutesObserved >= P.minMinutes &&
        maxReq >= P.minMaxRequests &&
        zScore >= P.zScoreThreshold
      ) {
        anomalies.push({
          type: 'HIGH_REQUEST_RATE',
          ip,
          requests: maxReq,
          zScore: Number(zScore.toFixed(2)),
          mean: Number(meanReq.toFixed(2)),
          std: Number(stdReq.toFixed(2)),
          minutesObserved,
          sampleMinute: maxPoint.minute,
          samples
        })
      }

      // 2) Burst spike compared to baseline
      if (
        minutesObserved >= P.minMinutes &&
        maxReq >= P.burstMinRequests &&
        burstRatio >= P.burstMultiplier
      ) {
        anomalies.push({
          type: 'BURST_SPIKE',
          ip,
          requests: maxReq,
          baseline,
          ratio: Number(burstRatio.toFixed(2)),
          minutesObserved,
          sampleMinute: maxPoint.minute,
          samples
        })
      }

      // 3) Bytes-heavy behavior
      if (totalRequests > 0 && totalBytes > 0) {
        const avgBytesPerReq = totalBytes / totalRequests
        if (avgBytesPerReq >= P.bytesPerRequestHeavy && totalRequests >= Math.max(1, Math.floor(P.minTotalRequests / 2))) {
          anomalies.push({
            type: 'BYTES_HEAVY',
            ip,
            avgBytesPerRequest: Math.round(avgBytesPerReq),
            totalBytes,
            totalRequests,
            minutesObserved,
            samples
          })
        }
      }

      // 4) Steady scraping: low variance but sustained
      if (
        minutesObserved >= Math.max(P.minMinutes * 2, 6) &&
        meanReq >= P.steadyMeanMin &&
        cvReq <= P.steadyCvMax &&
        totalRequests >= P.minTotalRequests
      ) {
        anomalies.push({
          type: 'STEADY_SCRAPE',
          ip,
          meanRequestsPerMinute: Number(meanReq.toFixed(2)),
          coefficientOfVariation: Number(cvReq.toFixed(3)),
          minutesObserved,
          totalRequests,
          samples
        })
      }

      // 5) Error-rate based anomalies if provided
      const st = ipStatus?.[ip]
      if (st && st.total && st.total >= P.minTotalRequests) {
        const fourxx = st.fourxx || 0
        const fivexx = st.fivexx || 0
        const nf404 = st.notFound404 || 0
        const r4 = fourxx / st.total
        const r5 = fivexx / st.total
        const r404 = nf404 / st.total

        if (r4 >= P.high4xxRate) {
          anomalies.push({ type: 'HIGH_4XX_RATE', ip, total: st.total, fourxx, rate: Number(r4.toFixed(3)) })
        }
        if (r5 >= P.high5xxRate) {
          anomalies.push({ type: 'HIGH_5XX_RATE', ip, total: st.total, fivexx, rate: Number(r5.toFixed(3)) })
        }
        if (r404 >= P.high404Rate) {
          anomalies.push({ type: 'HIGH_404_RATE', ip, total: st.total, notFound404: nf404, rate: Number(r404.toFixed(3)) })
        }
      }
    }

    return {
      success: true,
      summary: { ipsAnalyzed: analyzed, totalAnomalies: anomalies.length },
      anomalies
    }
  }
})

export type AnomalyDetectionInput = z.infer<typeof inputSchema>
export type AnomalyDetectionTool = typeof anomalyDetectionTool

