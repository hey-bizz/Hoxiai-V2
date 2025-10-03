// Core type definitions for Hoxi V2 log analysis platform

// Provider types
export type Provider = 'aws' | 'vercel' | 'netlify' | 'cloudflare' | 'wordpress' | 'github' | 'unknown'

export interface ProviderInfo {
  provider: Provider
  confidence: number
  costPerGB: number
}

// Base normalized log structure from different providers/formats
export interface NormalizedLog {
  timestamp: Date
  ip_address: string
  user_agent: string
  method: string
  path: string
  status_code: number
  bytes_transferred: number
  response_time_ms?: number

  // Optional bot detection fields (filled by detection engine)
  bot_name?: string
  is_bot?: boolean
  bot_category?: string
}

// Enhanced log entry for detection engine processing
export interface DetectionLogEntry extends NormalizedLog {
  // Core detection fields
  fingerprint: string
  sessionId: string

  // Additional optional fields
  referer?: string
  host?: string
  protocol?: string
  country?: string
  tlsVersion?: string
  requestBytes?: number
}

// Normalized log data structure for analyzer agent
export interface NormalizedLogData {
  metadata: {
    sourceFormat: 'CSV' | 'JSON' | 'JSONL' | 'APACHE' | 'NGINX'
    totalEntries: number
    timeRange: { start: string; end: string }
    provider: Provider
  }

  entries: DetectionLogEntry[]

  // Extract unique values for efficient LLM processing
  uniqueUserAgents: string[]
  uniqueIPs: string[]
  uniquePaths: string[]
}

// Cost calculation types
export interface CostAnalysis {
  totalCost: number
  breakdown: Array<{
    category: string
    monthlyCost: number
    bytes: number
  }>
}

// Bot classification result
export interface BotClassification {
  userAgent: string
  isBot: boolean
  botType?: string
  botName?: string
  confidence: number
}

// Analysis report structure
export interface AnalysisReport {
  summary: {
    totalRequests: number
    botPercentage: number
    totalCost: number
    topThreats: any[]
  }
  details: {
    classifications: Record<string, BotClassification>
    costs: CostAnalysis
    anomalies: any[]
  }
  recommendations: string[]
}