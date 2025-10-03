import { Provider, ProviderInfo, PROVIDER_COSTS, PROVIDER_PATTERNS } from './integrations/base'
import * as dns from 'dns'
import { promisify } from 'util'

const resolveNs = promisify(dns.resolveNs)
const resolveCname = promisify(dns.resolveCname)

export async function detectProvider(websiteUrl: string): Promise<ProviderInfo> {
  try {
    const url = new URL(websiteUrl)
    const host = url.hostname
    let provider: Provider = 'unknown'
    let confidence = 0

    // DNS heuristics (CNAME and NS records)
    try {
      const cnames = await resolveCname(host).catch(() => [])
      const ns = await resolveNs(host).catch(() => [])

      // Check each provider's patterns
      for (const [providerName, patterns] of Object.entries(PROVIDER_PATTERNS)) {
        // Check CNAME records
        if (patterns.dns && cnames.some(cname =>
          patterns.dns.some(pattern => pattern.test(cname))
        )) {
          provider = providerName as Provider
          confidence = 0.9
          break
        }

        // Check NS records
        if (patterns.ns && ns.some(nsRecord =>
          patterns.ns.some(pattern => pattern.test(nsRecord))
        )) {
          provider = providerName as Provider
          confidence = 0.85 // Slightly lower confidence than CNAME
          break
        }
      }
    } catch {
      // ignore DNS errors
    }

    // HTTP header heuristics (higher confidence)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const resp = await fetch(url.toString(), {
        method: 'HEAD',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const h = resp.headers
      const server = (h.get('server') || '').toLowerCase()
      const via = (h.get('via') || '').toLowerCase()

      // Check each provider's header patterns
      let headerMatch = false
      for (const [providerName, patterns] of Object.entries(PROVIDER_PATTERNS)) {
        // Check for specific headers
        if (patterns.headers) {
          for (const header of patterns.headers) {
            if (h.get(header) ||
                server.includes(header.toLowerCase()) ||
                via.includes(header.toLowerCase())) {
              headerMatch = true
              provider = providerName as Provider
              confidence = 0.95 // Highest confidence for HTTP headers
              break
            }
          }
        }

        if (headerMatch) break
      }

      // Legacy specific checks for common patterns
      if (!headerMatch) {
        if (h.get('cf-ray') || server.includes('cloudflare')) {
          provider = 'cloudflare'
          confidence = 0.95
        } else if (h.get('x-vercel-id') || server.includes('vercel')) {
          provider = 'vercel'
          confidence = 0.95
        } else if (h.get('x-nf-request-id')) {
          provider = 'netlify'
          confidence = 0.95
        } else if (via.includes('cloudfront') || server.includes('cloudfront')) {
          provider = 'aws'
          confidence = 0.9
        } else if (h.get('x-hacker') || server.includes('wordpress')) {
          provider = 'wordpress'
          confidence = 0.9
        } else if (h.get('x-github-request-id') || server.includes('github')) {
          provider = 'github'
          confidence = 0.9
        }
      }
    } catch {
      // ignore HTTP errors, keep DNS detection
    }

    return {
      provider,
      confidence,
      costPerGB: PROVIDER_COSTS[provider]
    }
  } catch {
    return {
      provider: 'unknown',
      confidence: 0,
      costPerGB: PROVIDER_COSTS.unknown
    }
  }
}

// Legacy function for backward compatibility
export async function detectProviderSimple(websiteUrl: string): Promise<Provider> {
  const result = await detectProvider(websiteUrl)
  return result.provider
}
