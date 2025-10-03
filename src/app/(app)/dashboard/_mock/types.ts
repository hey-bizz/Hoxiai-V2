export type AnalysisReport = {
  reportId: string
  siteId: string
  window: { start: string; end: string }
  provider: string
  versions: { pricing: string; signatures: string; sherlock: string; tools: Record<string, string> }
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
  anomalies: Array<{
    type: string
    score: number
    ip?: string
    path?: string
    evidence: any
    note?: string
    severity: 'Info' | 'Warning' | 'Critical'
    firstSeen: string
    lastSeen: string
    status: 'Open' | 'Acknowledged'
  }>
  notes: string[]
  createdAt: string
}

export type AggregatesBlob = {
  buckets: Array<{
    ts: string
    humanReq: number
    botReq: number
    humanBytes: number
    botBytes: number
  }>
  top: {
    ips: Array<{ key: string; req: number; bytes: number; isBot?: boolean }>
    paths: Array<{ key: string; req: number; bytes: number; errorRate?: number }>
    bots: Array<{ key: string; costUSD: number; req: number; bytes: number }>
  }
  ua: {
    new: Array<{ ua: string; firstSeen: string; req: number; bytes: number }>
    unknown: Array<{ ua: string; req: number; bytes: number; confidence: number; status?: 'Pending' | 'Resolved' }>
  }
}
