"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "../_utils/calculations"
import type { AnalysisReport } from "../_mock/types"

interface CostBreakdownTabsProps {
  report: AnalysisReport
}

type TabType = 'bot-vs-human' | 'status' | 'static-vs-dynamic'

export function CostBreakdownTabs({ report }: CostBreakdownTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('bot-vs-human')

  const tabs = [
    { id: 'bot-vs-human' as TabType, label: 'Bot vs Human' },
    { id: 'status' as TabType, label: 'By Status' },
    { id: 'static-vs-dynamic' as TabType, label: 'Static vs Dynamic' },
  ]

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#fafafa]">Cost Breakdown</h2>
        <Badge variant="outline" className="text-xs border-[#262626] text-[#a3a3a3]">
          {report.versions.pricing}
        </Badge>
      </div>

      <div className="flex gap-2 mb-6 border-b border-[#262626]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]'
                : 'text-[#a3a3a3] hover:text-[#fafafa]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'bot-vs-human' && (
          <>
            <CostBar
              name="Bot Traffic"
              cost={report.metrics.cost.botUSD}
              total={report.metrics.cost.totalUSD}
              color="from-red-500 to-orange-500"
            />
            <CostBar
              name="Human Traffic"
              cost={report.metrics.cost.humanUSD}
              total={report.metrics.cost.totalUSD}
              color="from-blue-500 to-cyan-500"
            />
          </>
        )}

        {activeTab === 'status' && (
          <>
            <CostBar name="2xx (Success)" cost={543.21} total={report.metrics.cost.totalUSD} color="from-green-500 to-emerald-500" />
            <CostBar name="3xx (Redirect)" cost={189.45} total={report.metrics.cost.totalUSD} color="from-yellow-500 to-amber-500" />
            <CostBar name="4xx (Client Error)" cost={89.23} total={report.metrics.cost.totalUSD} color="from-orange-500 to-red-500" />
            <CostBar name="5xx (Server Error)" cost={25.43} total={report.metrics.cost.totalUSD} color="from-red-500 to-rose-500" />
          </>
        )}

        {activeTab === 'static-vs-dynamic' && (
          <>
            <CostBar name="Static Assets" cost={412.34} total={report.metrics.cost.totalUSD} color="from-purple-500 to-pink-500" />
            <CostBar name="Dynamic API" cost={434.98} total={report.metrics.cost.totalUSD} color="from-cyan-500 to-blue-500" />
          </>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-[#262626]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#a3a3a3]">Total Cost</span>
          <span className="text-xl font-bold text-[#fafafa]">{formatCurrency(report.metrics.cost.totalUSD)}</span>
        </div>
      </div>
    </div>
  )
}

interface CostBarProps {
  name: string
  cost: number
  total: number
  color: string
}

function CostBar({ name, cost, total, color }: CostBarProps) {
  const percent = (cost / total) * 100

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-[#a3a3a3]">{name}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#a3a3a3]">{percent.toFixed(1)}%</span>
          <span className="font-mono font-semibold text-[#fafafa] w-20 text-right">{formatCurrency(cost)}</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#171717]">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
