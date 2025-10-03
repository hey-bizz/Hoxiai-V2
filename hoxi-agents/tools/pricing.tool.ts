// Pricing Tool - Get and cache hosting provider pricing data
// Provides current bandwidth pricing for cost calculations

import { tool } from 'ai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

interface PricingTier {
  min_gb: number
  max_gb: number | null
  price: number
}

interface ProviderPricing {
  pricePerGB: number
  pricePerMillionRequests: number
  includedBandwidthGB: number
  includedRequestsMillions: number
  currency: string
  sourceUrl: string
  confidence: number
  pricingTiers: PricingTier[]
}

export const pricingTool = tool({
  description: 'Get current bandwidth pricing for hosting providers, with caching for performance',
  inputSchema: z.object({
    provider: z.string().describe('Hosting provider name (e.g., vercel, cloudflare, aws, netlify)'),
    region: z.string().optional().describe('Region for pricing (defaults to global)'),
    updateDatabase: z.boolean().default(true).describe('Whether to update the database with new pricing data'),
    forceRefresh: z.boolean().default(false).describe('Force refresh cached pricing data')
  }),
  execute: async ({ provider, region = 'global', updateDatabase, forceRefresh }) => {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await getCachedPricing(provider, region)
        if (cached && isRecentlyUpdated(cached.last_verified)) {
          return {
            success: true,
            source: 'cache',
            data: {
              provider: cached.provider,
              region: cached.region,
              pricePerGB: cached.price_per_gb,
              pricePerMillionRequests: cached.price_per_million_requests,
              includedBandwidthGB: cached.included_bandwidth_gb,
              includedRequestsMillions: cached.included_requests_millions,
              currency: cached.currency,
              lastVerified: cached.last_verified,
              confidence: cached.confidence,
              pricingTiers: cached.pricing_tiers
            }
          }
        }
      }

      // Fetch current pricing from known rates or scrape
      const pricingData = await fetchCurrentPricing(provider, region)

      if (updateDatabase && pricingData) {
        await supabaseAdmin
          .from('hosting_pricing')
          .upsert({
            provider: provider.toLowerCase(),
            region,
            price_per_gb: pricingData.pricePerGB,
            price_per_million_requests: pricingData.pricePerMillionRequests,
            included_bandwidth_gb: pricingData.includedBandwidthGB || 0,
            included_requests_millions: pricingData.includedRequestsMillions || 0,
            pricing_tiers: pricingData.pricingTiers,
            currency: pricingData.currency || 'USD',
            source_url: pricingData.sourceUrl,
            confidence: pricingData.confidence || 0.9,
            last_verified: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'provider,region'
          })
      }

      return {
        success: true,
        source: 'live',
        data: pricingData
      }

    } catch (error) {
      console.error('Pricing tool error:', error)

      // Fallback to cached data even if old
      const fallback = await getCachedPricing(provider, region)
      if (fallback) {
        return {
          success: true,
          source: 'fallback_cache',
          warning: 'Using cached pricing data due to fetch error',
          data: {
            provider: fallback.provider,
            region: fallback.region,
            pricePerGB: fallback.price_per_gb,
            pricePerMillionRequests: fallback.price_per_million_requests,
            includedBandwidthGB: fallback.included_bandwidth_gb,
            includedRequestsMillions: fallback.included_requests_millions,
            currency: fallback.currency,
            lastVerified: fallback.last_verified,
            confidence: fallback.confidence
          }
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pricing data'
      }
    }
  }
})

// Get cached pricing from database
async function getCachedPricing(provider: string, region: string) {
  const { data, error } = await supabaseAdmin
    .from('hosting_pricing')
    .select('*')
    .eq('provider', provider.toLowerCase())
    .eq('region', region)
    .single()

  if (error || !data) return null
  return data
}

// Check if pricing data is recently updated (within 24 hours)
function isRecentlyUpdated(lastVerified: string): boolean {
  const lastUpdate = new Date(lastVerified)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return lastUpdate > oneDayAgo
}

// Fetch current pricing data
async function fetchCurrentPricing(provider: string, region: string) {
  const providerLower = provider.toLowerCase()

  // Known pricing data for major providers (updated as of 2024)
  const knownPricing: Record<string, ProviderPricing> = {
    vercel: {
      pricePerGB: 0.40,
      pricePerMillionRequests: 0.60,
      includedBandwidthGB: 100,
      includedRequestsMillions: 1,
      currency: 'USD',
      sourceUrl: 'https://vercel.com/pricing',
      confidence: 0.95,
      pricingTiers: [
        { min_gb: 0, max_gb: 100, price: 0 },
        { min_gb: 100, max_gb: null, price: 0.40 }
      ]
    },

    cloudflare: {
      pricePerGB: 0.045,
      pricePerMillionRequests: 0.50,
      includedBandwidthGB: 0, // No free bandwidth on paid plans
      includedRequestsMillions: 0,
      currency: 'USD',
      sourceUrl: 'https://www.cloudflare.com/plans/',
      confidence: 0.95,
      pricingTiers: [
        { min_gb: 0, max_gb: null, price: 0.045 }
      ]
    },

    netlify: {
      pricePerGB: 0.55,
      pricePerMillionRequests: 2.50,
      includedBandwidthGB: 100,
      includedRequestsMillions: 1,
      currency: 'USD',
      sourceUrl: 'https://www.netlify.com/pricing/',
      confidence: 0.90,
      pricingTiers: [
        { min_gb: 0, max_gb: 100, price: 0 },
        { min_gb: 100, max_gb: null, price: 0.55 }
      ]
    },

    aws: {
      pricePerGB: 0.085, // CloudFront pricing (varies by region)
      pricePerMillionRequests: 1.00,
      includedBandwidthGB: 0,
      includedRequestsMillions: 0,
      currency: 'USD',
      sourceUrl: 'https://aws.amazon.com/cloudfront/pricing/',
      confidence: 0.85, // Varies by region and usage tier
      pricingTiers: [
        { min_gb: 0, max_gb: 10000, price: 0.085 },
        { min_gb: 10000, max_gb: 50000, price: 0.080 },
        { min_gb: 50000, max_gb: null, price: 0.060 }
      ]
    },

    'railway.app': {
      pricePerGB: 0.10,
      pricePerMillionRequests: 1.00,
      includedBandwidthGB: 100,
      includedRequestsMillions: 1,
      currency: 'USD',
      sourceUrl: 'https://railway.app/pricing',
      confidence: 0.85
    },

    'render.com': {
      pricePerGB: 0.10,
      pricePerMillionRequests: 0,
      includedBandwidthGB: 100,
      includedRequestsMillions: null,
      currency: 'USD',
      sourceUrl: 'https://render.com/pricing',
      confidence: 0.85
    },

    'fly.io': {
      pricePerGB: 0.02,
      pricePerMillionRequests: 0,
      includedBandwidthGB: 160,
      includedRequestsMillions: null,
      currency: 'USD',
      sourceUrl: 'https://fly.io/pricing',
      confidence: 0.85
    }
  }

  const pricing = knownPricing[providerLower]

  if (pricing) {
    return {
      provider: providerLower,
      region,
      ...pricing,
      lastUpdated: new Date().toISOString()
    }
  }

  // If provider not in known list, try to estimate or return generic pricing
  return {
    provider: providerLower,
    region,
    pricePerGB: 0.10, // Generic estimate
    pricePerMillionRequests: 1.00,
    includedBandwidthGB: 0,
    includedRequestsMillions: 0,
    currency: 'USD',
    sourceUrl: 'estimated',
    confidence: 0.50,
    note: 'Estimated pricing - actual rates may vary'
  }
}

// Tool for bulk pricing updates
export const bulkPricingUpdateTool = tool({
  description: 'Update pricing data for multiple providers at once',
  inputSchema: z.object({
    providers: z.array(z.string()).describe('List of provider names to update'),
    region: z.string().default('global').describe('Region to update pricing for')
  }),
  execute: async ({ providers, region }) => {
    const results = []

    for (const provider of providers) {
      try {
        const pricing = await fetchCurrentPricing(provider, region)

        await supabaseAdmin
          .from('hosting_pricing')
          .upsert({
            provider: provider.toLowerCase(),
            region,
            price_per_gb: pricing.pricePerGB,
            price_per_million_requests: pricing.pricePerMillionRequests,
            included_bandwidth_gb: pricing.includedBandwidthGB || 0,
            included_requests_millions: pricing.includedRequestsMillions || 0,
            pricing_tiers: pricing.pricingTiers,
            currency: pricing.currency || 'USD',
            source_url: pricing.sourceUrl,
            confidence: pricing.confidence || 0.9,
            last_verified: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'provider,region'
          })

        results.push({
          provider,
          success: true,
          pricePerGB: pricing.pricePerGB
        })
      } catch (error) {
        results.push({
          provider,
          success: false,
          error: error instanceof Error ? error.message : 'Update failed'
        })
      }
    }

    return {
      success: true,
      results,
      summary: {
        total: providers.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    }
  }
})
