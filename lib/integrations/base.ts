// Base integration types for provider detection and log processing

export type Provider = 'aws' | 'vercel' | 'netlify' | 'cloudflare' | 'wordpress' | 'github' | 'unknown'

export interface ProviderInfo {
  provider: Provider
  confidence: number
  costPerGB: number
}

// Base normalized log structure
export interface NormalizedLog {
  timestamp: Date
  ip_address: string
  user_agent: string
  method: string
  path: string
  status_code: number
  bytes_transferred: number
  response_time_ms?: number

  // Optional bot detection fields
  bot_name?: string
  is_bot?: boolean
  bot_category?: string
}

// Provider-specific cost rates (USD per GB)
export const PROVIDER_COSTS: Record<Provider, number> = {
  aws: 0.09,
  vercel: 0.40,
  netlify: 0.55,
  cloudflare: 0.045,
  wordpress: 0.00, // WordPress.com is free for basic hosting
  github: 0.00,    // GitHub Pages is free
  unknown: 0.10
}

// Provider detection patterns for DNS and headers
export const PROVIDER_PATTERNS = {
  vercel: {
    dns: [/vercel-dns\.com/i, /cname\.vercel-dns\.com/i],
    ns: [/vercel/i],
    headers: ['x-vercel-id', 'x-vercel-cache']
  },
  netlify: {
    dns: [/netlify\.app/i, /netlifydns\.com/i],
    ns: [/netlify/i],
    headers: ['x-nf-request-id', 'x-nf-trace-id']
  },
  aws: {
    dns: [/cloudfront\.net/i, /amazonaws\.com/i],
    ns: [/awsdns/i, /amazonaws\.com/i],
    headers: ['x-amz-', 'x-cache']
  },
  cloudflare: {
    dns: [/cloudflare\.com$/i],
    ns: [/cloudflare\.com$/i],
    headers: ['cf-ray', 'cf-cache-status']
  },
  wordpress: {
    dns: [/wordpress\.com/i],
    ns: [/wordpress\.com$/i],
    headers: ['x-hacker']
  },
  github: {
    dns: [/github\.io/i, /githubapp\.com/i],
    ns: [/github/i, /dns\.github\.com/i],
    headers: ['x-github-request-id']
  }
}