// Hoxi AI - Main Entry Point
// Exports all components of the Hoxi AI intelligent layer

// Main Agent
export { HoxiAgent, hoxiAgent, isSimpleQuery, stepCountIs } from './agent/hoxi_chat.agent'

// Tools
export { analyticsTool } from './tools/analytics.tool'
export { pricingTool, bulkPricingUpdateTool } from './tools/pricing.tool'
export { recommendationsTool } from './tools/recommendations.tool'
export { insightsTool } from './tools/insights.tool'
export { supabaseMcpTool } from './tools/supabase-mcp.tool'
export { anomalyDetectionTool } from './tools/anomaly-detection.tool'
export { analyze } from './agent/analyzer'

// Services
export { CacheService, cacheService } from './services/cache.service'

// Prompts and Context
export { HOXI_SYSTEM_PROMPT, CONTEXT_TEMPLATES } from './prompts/system.prompt'

// Type definitions for Hoxi AI
export interface HoxiResponse {
  success: boolean
  data?: any
  error?: string
  confidence?: 'low' | 'medium' | 'high'
  source?: 'cache' | 'live' | 'fallback_cache'
  processingTime?: number
}

export interface ConversationContext {
  websiteId: string
  sessionId: string
  intent?: string
  latestAnalysis?: any
  costSummary?: any
  performance?: any
  toolUsage?: Array<{
    tools: string[]
    timestamp: string
  }>
  lastUpdated?: string
}

export interface HoxiAnalyticsQuery {
  websiteId: string
  query: 'latest_analysis' | 'top_bots_by_impact' | 'category_breakdown' | 'cost_trends' | 'detection_confidence' | 'bandwidth_analysis' | 'bot_activity_timeline'
  timeRange?: '24h' | '7d' | '30d' | '90d'
  limit?: number
}

export interface HoxiRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  action: string
  targets: string[]
  impact: {
    monthlySavings?: number
    bandwidthReduction?: string
    visibilityImpact?: string
    confidenceLevel?: number
    securityImprovement?: string
  }
  implementation: {
    robotsTxt?: string
    serverRules?: string[]
    rateLimiting?: any
    firewall?: boolean
    ipBlocking?: string[]
    priority?: 'immediate' | 'scheduled'
    monitoring?: boolean
    allowlist?: string[]
  }
  reasoning: string
  alternatives?: string[]
}

export interface HoxiInsight {
  type: 'cost_forecast' | 'bot_trends' | 'efficiency_analysis' | 'security_assessment' | 'optimization_opportunities' | 'competitive_analysis'
  summary: string
  confidence: 'low' | 'medium' | 'high'
  data?: any
}

// Utility functions
export const HoxiUtils = {
  /**
   * Format bandwidth for display
   */
  formatBandwidth(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`
  },

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  },

  /**
   * Calculate confidence level
   */
  getConfidenceLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.8) return 'high'
    if (score >= 0.6) return 'medium'
    return 'low'
  },

  /**
   * Extract bot name from user agent
   */
  extractBotName(userAgent: string): string {
    const botPatterns = [
      /GPTBot/i,
      /Googlebot/i,
      /bingbot/i,
      /slurp/i,
      /CCBot/i,
      /anthropic-ai/i,
      /PerplexityBot/i,
      /Bytespider/i
    ]

    for (const pattern of botPatterns) {
      const match = userAgent.match(pattern)
      if (match) {
        return match[0]
      }
    }

    // Fallback: try to extract first word that looks like a bot
    const words = userAgent.split(/[\s\/\-\(\)]+/)
    for (const word of words) {
      if (word.toLowerCase().includes('bot') ||
          word.toLowerCase().includes('crawl') ||
          word.toLowerCase().includes('spider')) {
        return word
      }
    }

    return 'Unknown Bot'
  },

  /**
   * Generate session ID
   */
  generateSessionId(): string {
    return `hoxi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Validate website ID format
   */
  isValidWebsiteId(websiteId: string): boolean {
    return /^[a-zA-Z0-9\-_]+$/.test(websiteId) && websiteId.length > 0 && websiteId.length <= 100
  }
}

// Error classes
export class HoxiError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message)
    this.name = 'HoxiError'
  }
}

export class HoxiToolError extends HoxiError {
  constructor(
    toolName: string,
    message: string,
    context?: any
  ) {
    super(`Tool ${toolName} error: ${message}`, 'TOOL_ERROR', { toolName, ...context })
  }
}

export class HoxiCacheError extends HoxiError {
  constructor(
    operation: string,
    message: string,
    context?: any
  ) {
    super(`Cache ${operation} error: ${message}`, 'CACHE_ERROR', { operation, ...context })
  }
}
