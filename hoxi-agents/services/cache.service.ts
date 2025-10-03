// Cache Service - Optimized caching for Hoxi AI responses and data
// Improves performance by caching frequent queries and analysis results

import { supabaseAdmin } from '@/lib/supabase'

interface CacheEntry<T = unknown> {
  data: T
  expiry: number
  hits: number
  lastAccessed: string
}

interface CostAnalysis {
  monthlyAverage: number
  trend: 'increasing' | 'decreasing' | 'stable'
  breakdown: Record<string, { cost: number; count: number }>
  lastUpdated: string
}

interface DetectionSummary {
  totalBots: number
  topBots: Array<{ bot_name: string; category: string; count: number; total_bandwidth: number }>
  categoryBreakdown: Record<string, { count: number; bandwidth: number }>
  totalBandwidth: number
  lastUpdated: string
}

export class CacheService {
  private cache = new Map<string, CacheEntry>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes
  private readonly maxCacheSize = 1000 // Maximum cache entries

  /**
   * Get cached cost analysis for a website
   */
  async getCachedCostAnalysis(websiteId: string, timeRange?: string): Promise<CostAnalysis | null> {
    const key = `cost:${websiteId}:${timeRange || '30d'}`
    const cached = this.get<CostAnalysis>(key)

    if (cached) {
      return cached
    }

    // Fetch from database
    const { data } = await supabaseAdmin
      .from('cost_analyses')
      .select('*')
      .eq('website_id', websiteId)
      .order('analysis_date', { ascending: false })
      .limit(30)

    if (data) {
      const result = {
        monthlyAverage: this.calculateMonthlyAverage(data),
        trend: this.calculateTrend(data),
        breakdown: this.aggregateByProvider(data),
        lastUpdated: new Date().toISOString()
      }

      this.set(key, result, this.defaultTTL)
      return result
    }

    return null
  }

  /**
   * Get cached bot detection summary
   */
  async getCachedDetectionSummary(websiteId: string, timeRange?: string): Promise<DetectionSummary | null> {
    const key = `detection:${websiteId}:${timeRange || '24h'}`
    const cached = this.get<DetectionSummary>(key)

    if (cached) {
      return cached
    }

    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1
    const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000))

    const { data } = await supabaseAdmin
      .from('bot_detections')
      .select('bot_name, category, count(*) as count, sum(bandwidth_bytes)::bigint as total_bandwidth')
      .eq('website_id', websiteId)
      .gte('detected_at', cutoffDate.toISOString())
      .group(['bot_name', 'category'])
      .order('total_bandwidth', { ascending: false })

    if (data) {
      const result = {
        totalBots: data.length,
        topBots: data.slice(0, 10),
        categoryBreakdown: this.aggregateByCategory(data),
        totalBandwidth: data.reduce((sum, bot) => sum + Number(bot.total_bandwidth), 0),
        lastUpdated: new Date().toISOString()
      }

      this.set(key, result, this.defaultTTL)
      return result
    }

    return null
  }

  /**
   * Cache pricing data
   */
  async cachePricingData(provider: string, region: string, data: Record<string, unknown>): Promise<void> {
    const key = `pricing:${provider}:${region}`
    // Cache pricing for 24 hours since it changes infrequently
    this.set(key, data, 24 * 60 * 60 * 1000)
  }

  /**
   * Get cached pricing data
   */
  getCachedPricing(provider: string, region: string): Record<string, unknown> | null {
    const key = `pricing:${provider}:${region}`
    return this.get(key)
  }

  /**
   * Cache insights data
   */
  cacheInsights(websiteId: string, insightType: string, data: Record<string, unknown>): void {
    const key = `insights:${websiteId}:${insightType}`
    // Cache insights for 1 hour
    this.set(key, data, 60 * 60 * 1000)
  }

  /**
   * Get cached insights
   */
  getCachedInsights(websiteId: string, insightType: string): Record<string, unknown> | null {
    const key = `insights:${websiteId}:${insightType}`
    return this.get(key)
  }

  /**
   * Cache recommendations
   */
  cacheRecommendations(websiteId: string, userGoal: string, data: Record<string, unknown>): void {
    const key = `recommendations:${websiteId}:${userGoal}`
    // Cache recommendations for 30 minutes
    this.set(key, data, 30 * 60 * 1000)
  }

  /**
   * Get cached recommendations
   */
  getCachedRecommendations(websiteId: string, userGoal: string): Record<string, unknown> | null {
    const key = `recommendations:${websiteId}:${userGoal}`
    return this.get(key)
  }

  /**
   * Generic get method
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics
    entry.hits++
    entry.lastAccessed = new Date().toISOString()

    return entry.data as T
  }

  /**
   * Generic set method
   */
  private set<T>(key: string, data: T, ttlMs?: number): void {
    // Clean up cache if it's getting too large
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup()
    }

    const expiry = Date.now() + (ttlMs || this.defaultTTL)

    this.cache.set(key, {
      data,
      expiry,
      hits: 0,
      lastAccessed: new Date().toISOString()
    })
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries for a website
   */
  clearWebsiteCache(websiteId: string): number {
    let cleared = 0
    for (const key of this.cache.keys()) {
      if (key.includes(websiteId)) {
        this.cache.delete(key)
        cleared++
      }
    }
    return cleared
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear()
  }

  /**
   * Clean up expired entries and least used entries
   */
  private cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())

    // Remove expired entries
    let cleaned = 0
    for (const [key, entry] of entries) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        cleaned++
      }
    }

    // If still too large, remove least used entries
    if (this.cache.size >= this.maxCacheSize) {
      const remainingEntries = Array.from(this.cache.entries())
      remainingEntries.sort(([, a], [, b]) => a.hits - b.hits)

      const toRemove = this.cache.size - Math.floor(this.maxCacheSize * 0.8)
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(remainingEntries[i][0])
        cleaned++
      }
    }

    console.log(`Cache cleanup: removed ${cleaned} entries`)
  }

  /**
   * Get cache statistics
   */
  getStatistics() {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0)
    const expired = entries.filter(entry => Date.now() > entry.expiry).length

    return {
      totalEntries: this.cache.size,
      totalHits,
      expiredEntries: expired,
      hitRate: totalHits / Math.max(this.cache.size, 1),
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): string {
    const jsonSize = JSON.stringify(Array.from(this.cache.entries())).length
    const sizeInKB = Math.round(jsonSize / 1024)

    if (sizeInKB > 1024) {
      return `${Math.round(sizeInKB / 1024)}MB`
    }
    return `${sizeInKB}KB`
  }

  /**
   * Helper functions for data processing
   */
  private calculateMonthlyAverage(data: Array<{ bot_cost_usd?: number }>): number {
    if (data.length === 0) return 0
    const sum = data.reduce((total, item) => total + (item.bot_cost_usd || 0), 0)
    return Math.round((sum / data.length) * 30 * 100) / 100 // Project to monthly
  }

  private calculateTrend(data: Array<{ bot_cost_usd?: number }>): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable'

    const recent = data.slice(0, Math.ceil(data.length / 2))
    const older = data.slice(Math.ceil(data.length / 2))

    const recentAvg = recent.reduce((sum, item) => sum + (item.bot_cost_usd || 0), 0) / recent.length
    const olderAvg = older.reduce((sum, item) => sum + (item.bot_cost_usd || 0), 0) / older.length

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100

    if (changePercent > 10) return 'increasing'
    if (changePercent < -10) return 'decreasing'
    return 'stable'
  }

  private aggregateByProvider(data: Array<{ hosting_provider?: string; bot_cost_usd?: number }>): Record<string, { cost: number; count: number }> {
    return data.reduce((acc: Record<string, { cost: number; count: number }>, item) => {
      const provider = item.hosting_provider || 'unknown'
      if (!acc[provider]) {
        acc[provider] = { cost: 0, count: 0 }
      }
      acc[provider].cost += item.bot_cost_usd || 0
      acc[provider].count += 1
      return acc
    }, {})
  }

  private aggregateByCategory(data: Array<{ category?: string; count?: number; total_bandwidth?: number }>): Record<string, { count: number; bandwidth: number }> {
    return data.reduce((acc: Record<string, { count: number; bandwidth: number }>, item) => {
      const category = item.category || 'unknown'
      if (!acc[category]) {
        acc[category] = { count: 0, bandwidth: 0 }
      }
      acc[category].count += Number(item.count) || 0
      acc[category].bandwidth += Number(item.total_bandwidth) || 0
      return acc
    }, {})
  }
}

// Export singleton instance
export const cacheService = new CacheService()