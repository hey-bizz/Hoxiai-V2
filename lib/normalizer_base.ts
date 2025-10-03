// Provider-agnostic interfaces and types
// Keep functions small and focused; use named exports.

export type Provider = 'cloudflare' | 'vercel' | 'aws' | 'netlify' | 'unknown'

export interface IntegrationRecord {
  id?: string
  websiteId: string
  provider: Provider
  externalIds?: Record<string, string>
  credentials?: Record<string, unknown>
  status?: 'pending' | 'active' | 'error'
  createdAt?: string
  lastSync?: string
}

export interface NormalizedLog {
  timestamp: Date
  ip_address?: string
  user_agent?: string
  bot_name?: string | null
  is_bot: boolean
  bot_category?: string | null
  bytes_transferred: number
  response_time_ms?: number
  status_code?: number
  path?: string
  method?: string
}

export interface AuthInitResult {
  // For OAuth providers, provide URL to redirect the user.
  url?: string
  // For token-based providers, indicate a token form is required.
  requiresToken?: boolean
}

export interface AuthCallbackResult {
  credentials: Record<string, unknown>
  externalIds?: Record<string, string>
}

export interface SetupResult {
  success: boolean
  details?: Record<string, unknown>
}

export interface IntegrationHandler {
  provider: Provider
  authorizeInit(websiteUrl: string): Promise<AuthInitResult>
  authorizeCallback(params: URLSearchParams): Promise<AuthCallbackResult>
  setupStreaming(integration: IntegrationRecord, websiteId: string): Promise<SetupResult>
  teardownStreaming(integration: IntegrationRecord): Promise<void>
  fetchBackfill(integration: IntegrationRecord, since: Date, until: Date): Promise<NormalizedLog[]>
  normalizeWebhook(payload: unknown, headers: Record<string, string>): NormalizedLog[]
  verifyWebhook(headers: Record<string, string>, rawBody: string | Buffer): boolean
}
