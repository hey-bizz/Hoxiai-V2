// Analytics Tool - Query Core Detection Engine results from Supabase
// Provides data access for Hoxi AI to analyze bot traffic patterns

import { tool } from 'ai'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'

interface AnalyticsCostAnalysisRow {
  analysis_date: string
  total_cost_usd: number
  bot_cost_usd: number
  total_bandwidth_gb: number
  bot_requests: number
  projected_monthly_cost: number | null
}

interface ReliabilityDetection {
  confidence: number
  detection_method: Record<string, unknown> | null
  verified: boolean
}

export const analyticsTool = tool({
  description: 'Query bot detection results and analytics from Core Detection Engine analysis stored in Supabase',
  inputSchema: z.object({
    websiteId: z.string().describe('Website ID to query data for'),
    query: z.enum([
      'latest_analysis',
      'top_bots_by_impact',
      'category_breakdown',
      'cost_trends',
      'detection_confidence',
      'bandwidth_analysis',
      'bot_activity_timeline'
    ]).describe('Type of analytics query to perform'),
    timeRange: z.enum(['24h', '7d', '30d', '90d']).default('30d').describe('Time range for the analysis'),
    limit: z.number().optional().default(10).describe('Maximum number of results to return')
  }),
  execute: async ({ websiteId, query, timeRange, limit }) => {
    try {
      const timeRangeMap = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      }
      const daysBack = timeRangeMap[timeRange]
      const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000))

      switch (query) {
        case 'latest_analysis': {
          // Get most recent bot detections with cost analysis
          const { data, error } = await supabaseAdmin
            .from('bot_detections')
            .select(`
              *,
              cost_analyses!inner(
                total_cost_usd,
                bot_cost_usd,
                total_bandwidth_gb,
                projected_monthly_cost
              )
            `)
            .eq('website_id', websiteId)
            .gte('detected_at', cutoffDate.toISOString())
            .order('detected_at', { ascending: false })
            .limit(limit)

          if (error) throw error

          return {
            success: true,
            data: data?.map(detection => ({
              botName: detection.bot_name,
              category: detection.category,
              subcategory: detection.subcategory,
              confidence: Math.round(detection.confidence * 100),
              impact: detection.impact,
              requests: detection.request_count,
              bandwidthMB: Math.round(detection.bandwidth_bytes / (1024 * 1024)),
              bandwidthGB: (detection.bandwidth_bytes / (1024 ** 3)).toFixed(3),
              estimatedCost: detection.cost_analyses?.[0]?.bot_cost_usd || 0,
              projectedMonthlyCost: detection.cost_analyses?.[0]?.projected_monthly_cost || 0,
              detectionMethod: detection.detection_method,
              verified: detection.verified,
              firstSeen: detection.first_seen_at,
              lastSeen: detection.last_seen_at,
              ipAddress: detection.ip_address,
              userAgent: detection.user_agent
            })) || [],
            summary: {
              totalBots: data?.length || 0,
              timeRange: timeRange,
              analysisDate: new Date().toISOString()
            }
          }
        }

        case 'top_bots_by_impact': {
          const { data, error } = await supabaseAdmin
            .from('bot_detections')
            .select('bot_name, category, impact, sum(bandwidth_bytes)::bigint as total_bandwidth, sum(request_count)::bigint as total_requests, avg(confidence)::numeric as avg_confidence')
            .eq('website_id', websiteId)
            .gte('detected_at', cutoffDate.toISOString())
            .group(['bot_name', 'category', 'impact'])
            .order('total_bandwidth', { ascending: false })
            .limit(limit)

          if (error) throw error

          return {
            success: true,
            data: data?.map(bot => ({
              botName: bot.bot_name,
              category: bot.category,
              impact: bot.impact,
              totalBandwidthGB: (Number(bot.total_bandwidth) / (1024 ** 3)).toFixed(3),
              totalRequests: Number(bot.total_requests),
              averageConfidence: Math.round(Number(bot.avg_confidence) * 100),
              costImpact: getImpactLevel(Number(bot.total_bandwidth))
            })) || []
          }
        }

        case 'category_breakdown': {
          const { data, error } = await supabaseAdmin
            .from('bot_detections')
            .select('category, count(*)::bigint as bot_count, sum(bandwidth_bytes)::bigint as total_bandwidth, sum(request_count)::bigint as total_requests')
            .eq('website_id', websiteId)
            .gte('detected_at', cutoffDate.toISOString())
            .group(['category'])
            .order('total_bandwidth', { ascending: false })

          if (error) throw error

          const totalBandwidth = data?.reduce((sum, cat) => sum + Number(cat.total_bandwidth), 0) || 0

          return {
            success: true,
            data: data?.map(category => ({
              category: category.category,
              botCount: Number(category.bot_count),
              bandwidthGB: (Number(category.total_bandwidth) / (1024 ** 3)).toFixed(3),
              requests: Number(category.total_requests),
              percentageOfTraffic: totalBandwidth > 0 ? ((Number(category.total_bandwidth) / totalBandwidth) * 100).toFixed(1) : '0'
            })) || [],
            summary: {
              totalCategories: data?.length || 0,
              totalBandwidthGB: (totalBandwidth / (1024 ** 3)).toFixed(3)
            }
          }
        }

        case 'cost_trends': {
          const { data, error } = await supabaseAdmin
            .from('cost_analyses')
            .select('analysis_date, total_cost_usd, bot_cost_usd, total_bandwidth_gb, bot_requests, projected_monthly_cost')
            .eq('website_id', websiteId)
            .gte('analysis_date', cutoffDate.toISOString().split('T')[0])
            .order('analysis_date', { ascending: false })

          if (error) throw error

          // Calculate trend
          const costRows = (data ?? []) as AnalyticsCostAnalysisRow[]
          const costs = costRows.map(d => d.bot_cost_usd)
          const trend = costs.length > 1 ? calculateTrend(costs) : 'insufficient_data'

          return {
            success: true,
            data: costRows,
            trend: {
              direction: trend,
              projectedMonthlyCost: costRows[0]?.projected_monthly_cost || 0,
              averageDailyCost: costs.length > 0 ? (costs.reduce((sum, cost) => sum + cost, 0) / costs.length).toFixed(2) : '0',
              savingsPotential: calculateSavingsPotential(costRows)
            }
          }
        }

        case 'detection_confidence': {
          const { data, error } = await supabaseAdmin
            .from('bot_detections')
            .select('bot_name, category, confidence, detection_method, verified')
            .eq('website_id', websiteId)
            .gte('detected_at', cutoffDate.toISOString())
            .order('confidence', { ascending: false })
            .limit(limit)

          if (error) throw error

          return {
            success: true,
            data: data?.map(detection => ({
              botName: detection.bot_name,
              category: detection.category,
              confidence: Math.round(detection.confidence * 100),
              detectionMethods: Object.keys(detection.detection_method || {}),
              verified: detection.verified,
              reliabilityScore: calculateReliabilityScore(detection)
            })) || [],
            summary: {
              averageConfidence: data ? Math.round((data.reduce((sum, d) => sum + d.confidence, 0) / data.length) * 100) : 0,
              highConfidenceCount: data?.filter(d => d.confidence > 0.8).length || 0,
              verifiedCount: data?.filter(d => d.verified).length || 0
            }
          }
        }

        case 'bandwidth_analysis': {
          const { data, error } = await supabaseAdmin
            .from('bot_detections')
            .select('bot_name, category, bandwidth_bytes, request_count, detected_at')
            .eq('website_id', websiteId)
            .gte('detected_at', cutoffDate.toISOString())
            .order('bandwidth_bytes', { ascending: false })
            .limit(limit * 2) // Get more data for analysis

          if (error) throw error

          const totalBandwidth = data?.reduce((sum, d) => sum + d.bandwidth_bytes, 0) || 0
          const totalRequests = data?.reduce((sum, d) => sum + d.request_count, 0) || 0

          return {
            success: true,
            data: data?.slice(0, limit).map(bot => ({
              botName: bot.bot_name,
              category: bot.category,
              bandwidthGB: (bot.bandwidth_bytes / (1024 ** 3)).toFixed(3),
              requests: bot.request_count,
              avgBytesPerRequest: Math.round(bot.bandwidth_bytes / bot.request_count),
              percentageOfTotal: totalBandwidth > 0 ? ((bot.bandwidth_bytes / totalBandwidth) * 100).toFixed(1) : '0'
            })) || [],
            summary: {
              totalBandwidthGB: (totalBandwidth / (1024 ** 3)).toFixed(3),
              totalRequests: totalRequests,
              averageBytesPerRequest: totalRequests > 0 ? Math.round(totalBandwidth / totalRequests) : 0,
              timeRange: timeRange
            }
          }
        }

        default:
          return {
            success: false,
            error: `Unknown query type: ${query}`
          }
      }
    } catch (error) {
      console.error('Analytics tool error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analytics query failed'
      }
    }
  }
})

// Helper functions
function getImpactLevel(bytes: number): string {
  const gb = bytes / (1024 ** 3)
  if (gb > 10) return 'extreme'
  if (gb > 5) return 'high'
  if (gb > 1) return 'medium'
  return 'low'
}

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable'

  const recent = values.slice(0, Math.ceil(values.length / 2))
  const older = values.slice(Math.ceil(values.length / 2))

  const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
  const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length

  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100

  if (changePercent > 10) return 'increasing'
  if (changePercent < -10) return 'decreasing'
  return 'stable'
}

function calculateSavingsPotential(costData: AnalyticsCostAnalysisRow[]): number {
  if (costData.length === 0) return 0

  // Calculate potential savings by blocking high-impact, low-value bots
  // This is a simplified calculation - real implementation would be more sophisticated
  const latestCost = costData[0]?.bot_cost_usd || 0
  const estimatedSavings = latestCost * 0.3 // Assume 30% savings potential

  return Math.round(estimatedSavings * 100) / 100
}

function calculateReliabilityScore(detection: ReliabilityDetection): number {
  let score = detection.confidence * 100

  // Boost score based on detection methods
  const methods = detection.detection_method || {}
  if (methods.signature) score += 10
  if (methods.pattern) score += 5
  if (detection.verified) score += 15

  return Math.min(100, Math.round(score))
}
