// Hoxi AI Agent - Main AI agent class for intelligent bot traffic analysis
// Provides the brain for recommendations and insights on top of Core Detection Engine

import { openai } from '@ai-sdk/openai'
import { HOXI_SYSTEM_PROMPT, CONTEXT_TEMPLATES } from '../prompts/system.prompt'
import { analyticsTool } from '../tools/analytics.tool'
import { pricingTool } from '../tools/pricing.tool'
import { recommendationsTool } from '../tools/recommendations.tool'
import { insightsTool } from '../tools/insights.tool'
import { supabaseMcpTool } from '../tools/supabase-mcp.tool'
import type { SupabaseMcpResponse, SupabaseMcpInput } from '../tools/supabase-mcp.tool'

type SupportedModel = 'gpt-4.1' | 'gpt-4.1-mini' 

interface SystemMessage {
  role: 'system'
  content: string
}

interface ToolUsageEntry {
  tools: string[]
  timestamp: string
}

interface ConversationContext {
  websiteId?: string
  latestAnalysis?: unknown
  costSummary?: unknown
  performance?: unknown
  toolUsage?: ToolUsageEntry[]
  lastUpdated?: string
  [key: string]: unknown
}

interface ToolCallSummary {
  toolName: string
}

interface MessageLike {
  content?: string
}

type SupabaseMcpExecute = (input: SupabaseMcpInput) => Promise<SupabaseMcpResponse>

type SupabaseMcpResult = Awaited<ReturnType<SupabaseMcpExecute>>

const isSupabaseMcpResponse = (value: unknown): value is SupabaseMcpResponse => {
  if (typeof value !== 'object' || value === null || !('success' in value)) {
    return false
  }

  const candidate = value as { success: unknown; data?: unknown; error?: unknown }

  if (candidate.success === true) {
    return 'data' in candidate
  }

  if (candidate.success === false) {
    return 'error' in candidate && typeof candidate.error === 'string'
  }

  return false
}

interface MCPDetectionRow {
  bot_name: string | null
  category?: string | null
  subcategory?: string | null
  confidence?: number | string | null
  impact?: string | null
  request_count?: number | string | null
  bandwidth_bytes?: number | string | null
}

interface MCPCostRow {
  analysis_date?: string | null
  bot_cost_usd?: number | string | null
  projected_monthly_cost?: number | string | null
  projected_yearly_cost?: number | string | null
}

interface MCPContextPayload {
  detections: MCPDetectionRow[]
  costAnalysis: MCPCostRow | null
  fetchedAt?: string
}

// Agent configuration
interface HoxiAgentConfig {
  model?: SupportedModel
  maxSteps?: number
  temperature?: number
  enableOptimizations?: boolean
}

export class HoxiAgent {
  private config: Required<HoxiAgentConfig>
  private conversationContext: Map<string, ConversationContext> = new Map()

  constructor(config: HoxiAgentConfig = {}) {
    this.config = {
      model: config.model || 'gpt-4.1',
      maxSteps: config.maxSteps || 5,
      temperature: config.temperature || 0.1, // Low temperature for consistent analysis
      enableOptimizations: config.enableOptimizations ?? true
    }
  }

  /**
   * Get the AI model configuration
   */
  getModel() {
    return openai(this.config.model)
  }

  /**
   * Get system prompt with optional context injection
   */
  getSystemPrompt(context?: Pick<ConversationContext, 'latestAnalysis' | 'costSummary' | 'performance'>) {
    let prompt = HOXI_SYSTEM_PROMPT

    if (context) {
      if (context.latestAnalysis) {
        prompt += '\n\n' + CONTEXT_TEMPLATES.latestAnalysis(context.latestAnalysis)
      }
      if (context.costSummary) {
        prompt += '\n\n' + CONTEXT_TEMPLATES.costSummary(context.costSummary)
      }
      if (context.performance) {
        prompt += '\n\n' + CONTEXT_TEMPLATES.performanceContext(context.performance)
      }
    }

    return prompt
  }

  /**
   * Get available tools
   */
  getTools() {
    return {
      queryAnalytics: analyticsTool,
      checkPricing: pricingTool,
      generateRecommendations: recommendationsTool,
      generateInsights: insightsTool,
      fetchLatestAnalysis: supabaseMcpTool
    }
  }

  /**
   * Optimize model selection based on query complexity
   */
  optimizeModelForQuery(message: string): SupportedModel {
    if (!this.config.enableOptimizations) {
      return this.config.model
    }

    const simplePatterns = [
      /which bot/i,
      /how much/i,
      /top \d+/i,
      /show me/i,
      /list/i,
      /what is/i,
      /when did/i
    ]

    const complexPatterns = [
      /analyze/i,
      /recommend/i,
      /optimize/i,
      /forecast/i,
      /trend/i,
      /insight/i,
      /strategy/i,
      /compare/i
    ]

    const isSimple = simplePatterns.some(pattern => pattern.test(message))
    const isComplex = complexPatterns.some(pattern => pattern.test(message))

    if (isSimple && !isComplex) {
      return 'gpt-4.1-mini' // Use cheaper model for simple queries
    }

    return 'gpt-4.1' // Use full model for complex analysis
  }

  /**
   * Prepare step configuration for streaming
   */
  prepareStep(_stepNumber: number, messages: MessageLike[]) {
    const lastMessageContent = messages[messages.length - 1]?.content
    const optimizedModel = this.optimizeModelForQuery(typeof lastMessageContent === 'string' ? lastMessageContent : '')

    return {
      model: openai(optimizedModel),
      temperature: this.config.temperature,
      maxSteps: this.config.maxSteps
    }
  }

  /**
   * Set conversation context
   */
  setContext(sessionId: string, context: Partial<ConversationContext>) {
    const existing = this.conversationContext.get(sessionId) ?? ({} as ConversationContext)
    this.conversationContext.set(sessionId, {
      ...existing,
      ...context,
      lastUpdated: new Date().toISOString()
    })
  }

  /**
   * Get conversation context
   */
  getContext(sessionId: string) {
    return this.conversationContext.get(sessionId)
  }

  /**
   * Clear conversation context
   */
  clearContext(sessionId: string) {
    this.conversationContext.delete(sessionId)
  }

  /**
   * Extract intent from user message
   */
  extractIntent(message: string): string {
    const intentPatterns = {
      cost_analysis: [/cost/i, /price/i, /expensive/i, /money/i, /budget/i],
      bot_inquiry: [/bot/i, /crawler/i, /which/i, /who/i],
      recommendations: [/recommend/i, /suggest/i, /should/i, /block/i, /allow/i],
      trends: [/trend/i, /forecast/i, /predict/i, /future/i, /growing/i],
      security: [/malicious/i, /threat/i, /security/i, /attack/i, /suspicious/i],
      performance: [/slow/i, /fast/i, /performance/i, /speed/i, /optimize/i]
    }

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      if (patterns.some(pattern => pattern.test(message))) {
        return intent
      }
    }

    return 'general_inquiry'
  }

  /**
   * Generate context message for the chat API
   */
  async generateContextMessage(websiteId: string): Promise<SystemMessage> {
    try {
      const HOURS_LOOKBACK = 168
      const execute = supabaseMcpTool.execute as SupabaseMcpExecute | undefined

      if (!execute) {
        throw new Error('Supabase MCP tool is not configured with an execute handler')
      }

      const result = (await execute({ websiteId, limit: 5, sinceHours: HOURS_LOOKBACK })) as SupabaseMcpResult

      if (!isSupabaseMcpResponse(result)) {
        throw new Error('Unexpected response from Supabase MCP tool')
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      const payload = result.data as MCPContextPayload
      const detections = payload.detections || []
      const costAnalysis = payload.costAnalysis
      const fetchedAt = payload.fetchedAt

      const topBots = detections.slice(0, 3)
      const botSummary = topBots.length
        ? topBots
            .map((bot, index) => {
              const requests = bot.request_count ? Number(bot.request_count) : 0
              const sizeMb = bot.bandwidth_bytes ? (Number(bot.bandwidth_bytes) / (1024 ** 2)).toFixed(1) : '0.0'
              const confidenceRaw = bot.confidence ? Number(bot.confidence) : 0
              const confidence = Math.max(0, Math.min(100, Math.round(confidenceRaw * 100)))
              const categoryLabel = [bot.category, bot.subcategory].filter(Boolean).join('/').trim()
              return `${index + 1}. ${bot.bot_name || 'Unknown Bot'} • ${categoryLabel || 'uncategorized'} • ${requests} requests • ${sizeMb} MB • ${confidence}% confidence`
            })
            .join('\n  ')
        : 'No bot sessions recorded in the selected window.'

      const costSummary = costAnalysis
        ? `Cost impact (latest ${costAnalysis.analysis_date || 'analysis'}): $${Number(costAnalysis.bot_cost_usd || 0).toFixed(2)} bot cost • projected monthly $${Number(costAnalysis.projected_monthly_cost || 0).toFixed(2)} • yearly $${Number(costAnalysis.projected_yearly_cost || 0).toFixed(2)}`
        : 'Cost analysis has not been generated yet for this website.'

      const context = {
        role: 'system' as const,
        content: `Current Analysis Context for Website ${websiteId} (fetched ${fetchedAt || 'just now'}):
- Core Detection Engine window: last ${HOURS_LOOKBACK} hours
- Bot sessions analyzed: ${detections.length}
- Top offenders:
  ${botSummary}
- ${costSummary}

Use available analytics tools for deeper queries and always rely on fresh Supabase data.`
      }

      return context
    } catch (error) {
      console.error('Error generating context message:', error)
      return {
        role: 'system' as const,
        content: 'Context unavailable - proceeding with tools to fetch current data.'
      }
    }
  }

  /**
   * Log tool usage for optimization
   */
  logToolUsage(toolCalls: ToolCallSummary[], sessionId: string) {
    if (!toolCalls?.length) return

    const toolNames = toolCalls.map(call => call.toolName)
    console.log(`Hoxi AI [${sessionId}] used tools: ${toolNames.join(', ')}`)

    // Store usage stats for optimization
    const context = this.getContext(sessionId) ?? ({} as ConversationContext)
    const existingUsage = context.toolUsage || []
    existingUsage.push({
      tools: toolNames,
      timestamp: new Date().toISOString()
    })
    this.setContext(sessionId, { ...context, toolUsage: existingUsage })
  }

  /**
   * Get agent statistics
   */
  getStatistics() {
    const activeContexts = this.conversationContext.size
    const totalToolUsage = Array.from(this.conversationContext.values())
      .reduce((total, context) => total + (context.toolUsage?.length || 0), 0)

    return {
      activeConversations: activeContexts,
      totalToolUsage,
      modelConfig: this.config.model,
      optimizationsEnabled: this.config.enableOptimizations
    }
  }

  /**
   * Update agent configuration
   */
  updateConfig(newConfig: Partial<HoxiAgentConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Health check
   */
  healthCheck() {
    return {
      status: 'healthy',
      model: this.config.model,
      tools: Object.keys(this.getTools()).length,
      activeContexts: this.conversationContext.size,
      lastUpdate: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const hoxiAgent = new HoxiAgent({
  model: 'gpt-4.1',
  maxSteps: 5,
  temperature: 0.1,
  enableOptimizations: true
})

// Helper function to determine if a query is simple
export function isSimpleQuery(message: string): boolean {
  const simplePatterns = [
    /which bot/i,
    /how much/i,
    /top \d+/i,
    /show me/i,
    /list/i,
    /what is/i,
    /when did/i
  ]
  return simplePatterns.some(pattern => pattern.test(message))
}

// Helper function for step counting
export interface StepInfo {
  stepNumber: number
}

export function stepCountIs(maxSteps: number) {
  return (step: StepInfo) => step.stepNumber >= maxSteps
}
