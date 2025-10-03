"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { formatPercent } from "../_utils/calculations"
import type { AnalysisReport, AggregatesBlob } from "../_mock/types"

interface BotHumanSplitProps {
  report: AnalysisReport
  aggregates: AggregatesBlob
}

export function BotHumanSplit({ report, aggregates }: BotHumanSplitProps) {
  const totalReq = aggregates.buckets.reduce((sum, b) => sum + b.humanReq + b.botReq, 0)
  const botReq = aggregates.buckets.reduce((sum, b) => sum + b.botReq, 0)
  const humanReq = totalReq - botReq

  const totalBytes = report.metrics.bytes.total
  const botBytes = report.metrics.bytes.bot
  const humanBytes = report.metrics.bytes.human

  // Estimate unique IPs from top IPs list
  const uniqueIPs = aggregates.top.ips.length
  const botIPs = aggregates.top.ips.filter(ip => ip.isBot).length
  const humanIPs = uniqueIPs - botIPs

  const metrics = [
    {
      label: "Requests",
      bot: botReq,
      human: humanReq,
      total: totalReq,
    },
    {
      label: "Bytes",
      bot: botBytes,
      human: humanBytes,
      total: totalBytes,
    },
    {
      label: "Unique IPs",
      bot: botIPs,
      human: humanIPs,
      total: uniqueIPs,
    },
  ]

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
      <h2 className="text-lg font-semibold mb-6 text-[#fafafa]">Bot vs Human Split</h2>
      <div className="grid grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <DonutChart key={index} {...metric} />
        ))}
      </div>
    </div>
  )
}

interface DonutChartProps {
  label: string
  bot: number
  human: number
  total: number
}

function DonutChart({ label, bot, human, total }: DonutChartProps) {
  const botPercent = (bot / total) * 100
  const humanPercent = (human / total) * 100

  const data = [
    { name: 'Bot', value: bot, color: '#ef4444' },
    { name: 'Human', value: human, color: '#3b82f6' },
  ]

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-[#a3a3a3] mb-3">{label}</div>
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={64}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-[#fafafa]">{botPercent.toFixed(0)}%</span>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-xs w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
            <span className="text-[#a3a3a3]">Bot</span>
          </div>
          <span className="text-[#fafafa] font-mono">{formatPercent(bot, total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
            <span className="text-[#a3a3a3]">Human</span>
          </div>
          <span className="text-[#fafafa] font-mono">{formatPercent(human, total)}</span>
        </div>
      </div>
    </div>
  )
}
