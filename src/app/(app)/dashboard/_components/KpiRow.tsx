"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { formatNumber, formatBytes, formatCurrency, formatPercent, calculatePercentChange } from "../_utils/calculations"
import type { AnalysisReport, AggregatesBlob } from "../_mock/types"

interface KpiRowProps {
  report: AnalysisReport
  aggregates: AggregatesBlob
}

interface KpiCardData {
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  sparklineData: number[]
  isGood?: boolean
}

export function KpiRow({ report, aggregates }: KpiRowProps) {
  const totalReq = aggregates.buckets.reduce((sum, b) => sum + b.humanReq + b.botReq, 0)
  const totalBytes = report.metrics.bytes.total
  const botReq = aggregates.buckets.reduce((sum, b) => sum + b.botReq, 0)
  const botBytes = report.metrics.bytes.bot

  // Calculate previous period (mock - using first half vs second half)
  const midpoint = Math.floor(aggregates.buckets.length / 2)
  const prevReq = aggregates.buckets.slice(0, midpoint).reduce((sum, b) => sum + b.humanReq + b.botReq, 0)
  const currReq = aggregates.buckets.slice(midpoint).reduce((sum, b) => sum + b.humanReq + b.botReq, 0)
  const prevBotReq = aggregates.buckets.slice(0, midpoint).reduce((sum, b) => sum + b.botReq, 0)
  const currBotReq = aggregates.buckets.slice(midpoint).reduce((sum, b) => sum + b.botReq, 0)

  const kpis: KpiCardData[] = [
    {
      label: "Total Requests",
      value: formatNumber(totalReq),
      change: `${calculatePercentChange(currReq, prevReq) > 0 ? '+' : ''}${calculatePercentChange(currReq, prevReq).toFixed(1)}%`,
      trend: calculatePercentChange(currReq, prevReq) > 0 ? 'up' : 'down',
      sparklineData: aggregates.buckets.map(b => b.humanReq + b.botReq),
    },
    {
      label: "% Bot Traffic",
      value: formatPercent(botReq, totalReq),
      change: `${calculatePercentChange(currBotReq / currReq, prevBotReq / prevReq) > 0 ? '+' : ''}${calculatePercentChange(currBotReq / currReq, prevBotReq / prevReq).toFixed(1)}%`,
      trend: calculatePercentChange(currBotReq / currReq, prevBotReq / prevReq) > 0 ? 'up' : 'down',
      sparklineData: aggregates.buckets.map(b => (b.botReq / (b.botReq + b.humanReq)) * 100),
      isGood: false,
    },
    {
      label: "Bandwidth",
      value: formatBytes(totalBytes),
      change: "-3.2%",
      trend: 'down',
      sparklineData: aggregates.buckets.map(b => b.humanBytes + b.botBytes),
      isGood: true,
    },
    {
      label: "Bot Cost",
      value: formatCurrency(report.metrics.cost.botUSD),
      change: "+8.4%",
      trend: 'up',
      sparklineData: aggregates.buckets.map(b => b.botBytes),
      isGood: false,
    },
    {
      label: "Error Rate",
      value: "0.8%",
      change: "-0.2%",
      trend: 'down',
      sparklineData: aggregates.buckets.map(() => Math.random() * 2),
      isGood: true,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi, index) => (
        <KpiCard key={index} {...kpi} />
      ))}
    </div>
  )
}

function KpiCard({ label, value, change, trend, sparklineData, isGood }: KpiCardData) {
  const isPositiveChange = trend === 'up'
  const changeColor = isGood !== undefined
    ? (isGood ? (trend === 'down' ? 'text-green-400' : 'text-red-400') : (trend === 'up' ? 'text-red-400' : 'text-green-400'))
    : (isPositiveChange ? 'text-green-400' : 'text-red-400')

  const max = Math.max(...sparklineData)
  const normalized = sparklineData.map(v => (v / max) * 100)

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-4 hover:border-[#404040] transition-colors">
      <div className="text-xs text-[#a3a3a3] mb-1">{label}</div>
      <div className="flex items-end justify-between mb-3">
        <div className="text-2xl font-bold text-[#fafafa]">{value}</div>
        <div className={`flex items-center gap-1 text-xs ${changeColor}`}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </div>
      </div>
      {/* Sparkline */}
      <div className="flex items-end gap-0.5 h-8">
        {normalized.map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-[#3b82f6]/30 rounded-sm transition-all hover:bg-[#3b82f6]/50"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  )
}
