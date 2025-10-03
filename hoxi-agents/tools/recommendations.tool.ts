// Recommendations Tool - Generate actionable recommendations based on Core Detection Engine results
// Provides intelligent recommendations for bot blocking and cost optimization

import { tool } from 'ai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

type UserGoal = 'minimize_cost' | 'balanced' | 'maximize_visibility'

interface CustomThresholds {
  minMonthlyCost?: number
  maxVisibilityImpact?: number
}

interface CostAnalysisLite {
  bot_cost_usd: number
  projected_monthly_cost: number | null
}

interface DetectionWithCost {
  category: string | null
  bandwidth_bytes: number
  request_count: number
  confidence: number
  bot_name: string | null
  ip_address?: string | null
  cost_analyses?: CostAnalysisLite[]
}

interface BotGroupAnalysis {
  categoryName: string
  botCount: number
  uniqueBots: string[]
  totalBandwidthGB: number
  totalRequests: number
  totalCost: number
  projectedMonthlyCost: number
  averageConfidence: number
  highestImpactBot: DetectionWithCost
  bots: DetectionWithCost[]
}

interface RateLimitingRule {
  userAgent: string
  limit: string
  burst: number
}

interface RateLimitingConfig {
  type: 'rate_limit'
  rules: RateLimitingRule[]
}

interface RecommendationImpact {
  monthlySavings: number
  bandwidthReduction: string
  visibilityImpact: string
  confidenceLevel: number
  securityImprovement?: string
}

interface RecommendationImplementation {
  robotsTxt?: string | null
  serverRules?: string[] | null
  priority?: 'immediate' | 'scheduled'
  rateLimiting?: RateLimitingConfig | null
  monitoring?: boolean
  alertThreshold?: number
  firewall?: boolean
  ipBlocking?: Array<string | null>
  crawlOptimization?: boolean
  allowlist?: string[]
}

interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  action: string
  targets: string[]
  impact: RecommendationImpact
  implementation: RecommendationImplementation
  reasoning: string
  alternatives: string[]
}

export const recommendationsTool = tool({
  description: 'Generate recommendations based on Core Detection Engine results and user goals',
  inputSchema: z.object({
    websiteId: z.string().describe('Website ID to generate recommendations for'),
    userGoal: z.enum(['minimize_cost', 'balanced', 'maximize_visibility']).default('balanced').describe('User optimization goal'),
    timeRange: z.enum(['24h', '7d', '30d']).default('30d').describe('Time range for analysis'),
    customThresholds: z.object({
      minMonthlyCost: z.number().optional().describe('Minimum monthly cost to consider for blocking'),
      maxVisibilityImpact: z.number().optional().describe('Maximum acceptable visibility impact (0-100)')
    }).optional()
  }),
  execute: async ({ websiteId, userGoal, timeRange, customThresholds }) => {
    try {
      const daysBack = { '24h': 1, '7d': 7, '30d': 30 }[timeRange]
      const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000))

      // Fetch latest detection results and cost analysis
      const { data: detections, error: detectionsError } = await supabaseAdmin
        .from('bot_detections')
        .select(`
          *,
          cost_analyses!inner(
            bot_cost_usd,
            projected_monthly_cost
          )
        `)
        .eq('website_id', websiteId)
        .gte('detected_at', cutoffDate.toISOString())

      if (detectionsError) throw detectionsError

      const detectionRows = (detections ?? []) as DetectionWithCost[]
      const goal: UserGoal = userGoal as UserGoal

      if (detectionRows.length === 0) {
        return {
          success: true,
          recommendations: [],
          summary: 'No bot detections found for the specified time range'
        }
      }

      // Group by bot category and calculate impact
      const botsByCategory = groupBotsByCategory(detectionRows)
      const recommendations: Recommendation[] = []
      let totalPotentialSavings = 0

      // AI Training bots (highest priority based on Core Detection Engine analysis)
      if (botsByCategory.ai_training?.length > 0) {
        const analysis = analyzeBotGroup(botsByCategory.ai_training, 'AI Training Crawlers')
        const recommendation = generateAITrainingRecommendation(analysis, goal, customThresholds as CustomThresholds | undefined)
        if (recommendation) {
          recommendations.push(recommendation)
          totalPotentialSavings += recommendation.impact.monthlySavings || 0
        }
      }

      // AI Scrapers
      if (botsByCategory.ai_scraper?.length > 0) {
        const analysis = analyzeBotGroup(botsByCategory.ai_scraper, 'AI Scrapers')
        const recommendation = generateAIScraperRecommendation(analysis, goal, customThresholds as CustomThresholds | undefined)
        if (recommendation) {
          recommendations.push(recommendation)
          totalPotentialSavings += recommendation.impact.monthlySavings || 0
        }
      }

      // Malicious bots (always block)
      if (botsByCategory.malicious?.length > 0) {
        const analysis = analyzeBotGroup(botsByCategory.malicious, 'Malicious Bots')
        const recommendation = generateMaliciousRecommendation(analysis)
        recommendations.push(recommendation)
        totalPotentialSavings += recommendation.impact.monthlySavings || 0
      }

      // Search engine bots (careful consideration)
      if (botsByCategory.search_engine?.length > 0) {
        const analysis = analyzeBotGroup(botsByCategory.search_engine, 'Search Engine Bots')
        const recommendation = generateSearchEngineRecommendation(analysis, goal, customThresholds as CustomThresholds | undefined)
        if (recommendation) {
          recommendations.push(recommendation)
          totalPotentialSavings += recommendation.impact.monthlySavings || 0
        }
      }

      // Beneficial bots (monitor only)
      if (botsByCategory.beneficial?.length > 0) {
        const analysis = analyzeBotGroup(botsByCategory.beneficial, 'Beneficial Bots')
        const recommendation = generateBeneficialRecommendation(analysis)
        if (recommendation) {
          recommendations.push(recommendation)
        }
      }

      // Sort recommendations by priority
      recommendations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

      return {
        success: true,
        recommendations,
        summary: {
          totalRecommendations: recommendations.length,
          totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
          timeRange,
          analysisDate: new Date().toISOString(),
          userGoal: goal,
          botCategoriesAnalyzed: Object.keys(botsByCategory).length
        }
      }

    } catch (error) {
      console.error('Recommendations tool error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate recommendations'
      }
    }
  }
})

// Helper functions
function groupBotsByCategory(detections: DetectionWithCost[]): Record<string, DetectionWithCost[]> {
  return detections.reduce<Record<string, DetectionWithCost[]>>((groups, detection) => {
    const category = detection.category || 'unknown'
    if (!groups[category]) groups[category] = []
    groups[category].push(detection)
    return groups
  }, {})
}

function analyzeBotGroup(bots: DetectionWithCost[], categoryName: string): BotGroupAnalysis {
  const totalBandwidth = bots.reduce((sum, bot) => sum + bot.bandwidth_bytes, 0)
  const totalRequests = bots.reduce((sum, bot) => sum + bot.request_count, 0)
  const totalCost = bots.reduce((sum, bot) => sum + (bot.cost_analyses?.[0]?.bot_cost_usd || 0), 0)
  const projectedMonthlyCost = bots.reduce((sum, bot) => sum + (bot.cost_analyses?.[0]?.projected_monthly_cost || 0), 0)
  const averageConfidence = bots.reduce((sum, bot) => sum + bot.confidence, 0) / bots.length
  const uniqueBots = [...new Set(bots.map(bot => bot.bot_name))].filter((name): name is string => Boolean(name))
  const highestImpactBot = bots.reduce((max, bot) =>
    bot.bandwidth_bytes > max.bandwidth_bytes ? bot : max, bots[0]
  )

  return {
    categoryName,
    botCount: bots.length,
    uniqueBots,
    totalBandwidthGB: totalBandwidth / (1024 ** 3),
    totalRequests,
    totalCost,
    projectedMonthlyCost,
    averageConfidence,
    highestImpactBot,
    bots
  }
}

function generateAITrainingRecommendation(
  analysis: BotGroupAnalysis,
  userGoal: UserGoal,
  customThresholds?: CustomThresholds
): Recommendation | null {
  const { projectedMonthlyCost, uniqueBots, totalBandwidthGB } = analysis

  // AI training bots have 887:1 crawl-to-referral ratio (very low value)
  const minCostThreshold = customThresholds?.minMonthlyCost || 5 // $5/month minimum

  if (projectedMonthlyCost < minCostThreshold) return null

  const action = userGoal === 'maximize_visibility' ? 'selective_block' : 'block_all'
  const monthlySavings = userGoal === 'maximize_visibility' ? projectedMonthlyCost * 0.7 : projectedMonthlyCost

  return {
    priority: 'high' as const,
    category: 'AI Training Crawlers',
    action,
    targets: uniqueBots,
    impact: {
      monthlySavings: Math.round(monthlySavings * 100) / 100,
      bandwidthReduction: `${totalBandwidthGB.toFixed(2)} GB`,
      visibilityImpact: 'Reduced AI search presence',
      confidenceLevel: Math.round(analysis.averageConfidence * 100)
    },
    implementation: {
      robotsTxt: generateRobotsTxtRules(uniqueBots),
      serverRules: generateServerRules(uniqueBots),
      priority: action === 'block_all' ? 'immediate' : 'scheduled'
    },
    reasoning: 'AI training bots have extremely low referral value (887:1 crawl-to-referral ratio) but consume significant bandwidth. Blocking provides immediate cost savings with minimal business impact.',
    alternatives: userGoal === 'maximize_visibility' ? [
      'Allow during off-peak hours only',
      'Implement rate limiting instead of blocking',
      'Block only the highest-cost AI training bots'
    ] : []
  }
}

function generateAIScraperRecommendation(
  analysis: BotGroupAnalysis,
  userGoal: UserGoal,
  customThresholds?: CustomThresholds
): Recommendation | null {
  const { projectedMonthlyCost, uniqueBots, totalBandwidthGB } = analysis

  if (projectedMonthlyCost < 3) return null // Less aggressive than AI training

  const action = userGoal === 'minimize_cost' ? 'block_all' : 'rate_limit'
  const monthlySavings = action === 'block_all' ? projectedMonthlyCost : projectedMonthlyCost * 0.5

  return {
    priority: 'medium' as const,
    category: 'AI Scrapers',
    action,
    targets: uniqueBots,
    impact: {
      monthlySavings: Math.round(monthlySavings * 100) / 100,
      bandwidthReduction: `${totalBandwidthGB.toFixed(2)} GB`,
      visibilityImpact: action === 'block_all' ? 'Reduced AI service visibility' : 'Minimal impact',
      confidenceLevel: Math.round(analysis.averageConfidence * 100)
    },
    implementation: {
      robotsTxt: action === 'block_all' ? generateRobotsTxtRules(uniqueBots) : null,
      rateLimiting: action === 'rate_limit' ? generateRateLimitingRules(uniqueBots) : null,
      serverRules: generateServerRules(uniqueBots)
    },
    reasoning: 'AI scrapers provide some visibility value but can be cost-intensive. Rate limiting balances cost control with AI service visibility.',
    alternatives: [
      'Implement time-based blocking (allow during off-peak)',
      'Block only during high-traffic periods',
      'Selective blocking based on bandwidth usage'
    ]
  }
}

function generateMaliciousRecommendation(analysis: BotGroupAnalysis): Recommendation {
  const { projectedMonthlyCost, uniqueBots, totalBandwidthGB, bots } = analysis

  return {
    priority: 'critical' as const,
    category: 'Malicious Bots',
    action: 'immediate_block',
    targets: uniqueBots,
    impact: {
      monthlySavings: Math.round(projectedMonthlyCost * 100) / 100,
      bandwidthReduction: `${totalBandwidthGB.toFixed(2)} GB`,
      visibilityImpact: 'None (security improvement)',
      securityImprovement: 'Eliminates malicious traffic',
      confidenceLevel: Math.round(analysis.averageConfidence * 100)
    },
    implementation: {
      firewall: true,
      ipBlocking: [...new Set(bots.map(bot => bot.ip_address))],
      serverRules: generateServerRules(uniqueBots),
      robotsTxt: generateRobotsTxtRules(uniqueBots),
      priority: 'immediate'
    },
    reasoning: 'Malicious bots pose security risks and consume resources without providing any value. Immediate blocking is recommended for security and cost optimization.',
    alternatives: []
  }
}

function generateSearchEngineRecommendation(
  analysis: BotGroupAnalysis,
  userGoal: UserGoal,
  customThresholds?: CustomThresholds
): Recommendation | null {
  const { projectedMonthlyCost, uniqueBots, totalBandwidthGB } = analysis

  // Only recommend action for search engines if cost is very high
  const highCostThreshold = customThresholds?.minMonthlyCost || 50

  if (projectedMonthlyCost < highCostThreshold) {
    return {
      priority: 'low' as const,
      category: 'Search Engine Bots',
      action: 'monitor',
      targets: uniqueBots,
      impact: {
        monthlySavings: 0,
        bandwidthReduction: 'N/A',
        visibilityImpact: 'Maintained SEO visibility',
        confidenceLevel: Math.round(analysis.averageConfidence * 100)
      },
      implementation: {
        monitoring: true,
        alertThreshold: highCostThreshold
      },
      reasoning: 'Search engine bots are crucial for SEO visibility. Current costs are within acceptable range for the SEO benefits provided.',
      alternatives: []
    }
  }

  return {
    priority: 'medium' as const,
    category: 'Search Engine Bots',
    action: userGoal === 'minimize_cost' ? 'rate_limit' : 'optimize_crawling',
    targets: uniqueBots,
    impact: {
      monthlySavings: Math.round(projectedMonthlyCost * 0.3 * 100) / 100,
      bandwidthReduction: `${(totalBandwidthGB * 0.3).toFixed(2)} GB`,
      visibilityImpact: 'Potential minor SEO impact',
      confidenceLevel: Math.round(analysis.averageConfidence * 100)
    },
    implementation: {
      rateLimiting: generateRateLimitingRules(uniqueBots),
      crawlOptimization: true
    },
    reasoning: 'Search engine bot costs are high. Consider optimizing crawl efficiency rather than blocking to maintain SEO benefits.',
    alternatives: [
      'Use robots.txt to guide more efficient crawling',
      'Implement crawl-delay directives',
      'Optimize site structure to reduce crawl depth'
    ]
  }
}

function generateBeneficialRecommendation(analysis: BotGroupAnalysis): Recommendation {
  return {
    priority: 'low' as const,
    category: 'Beneficial Bots',
    action: 'allow_and_monitor',
    targets: analysis.uniqueBots,
    impact: {
      monthlySavings: 0,
      bandwidthReduction: 'N/A',
      visibilityImpact: 'Positive business impact',
      confidenceLevel: Math.round(analysis.averageConfidence * 100)
    },
    implementation: {
      monitoring: true,
      allowlist: analysis.uniqueBots
    },
    reasoning: 'Beneficial bots provide value through monitoring, analytics, or legitimate services. Continue allowing with cost monitoring.',
    alternatives: []
  }
}

function generateRobotsTxtRules(botNames: string[]): string {
  return botNames.map(botName => {
    const cleanBotName = botName.replace(/\/.*$/, '') // Remove version info
    return `User-agent: ${cleanBotName}\nDisallow: /`
  }).join('\n\n')
}

function generateServerRules(botNames: string[]): string[] {
  return botNames.map(botName => {
    const cleanBotName = botName.replace(/\/.*$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return `deny user_agent ~*${cleanBotName}`
  })
}

function generateRateLimitingRules(botNames: string[]): RateLimitingConfig {
  return {
    type: 'rate_limit',
    rules: botNames.map(botName => ({
      userAgent: botName,
      limit: '10 requests per minute',
      burst: 5
    }))
  }
}
