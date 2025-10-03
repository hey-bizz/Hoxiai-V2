"use client"

import { useSetAtom } from "jotai"
import { openDetailsDrawerAtom, addFilterChipAtom } from "../_state/useDashboardState"
import { formatNumber, formatBytes, formatCurrency, formatPercent } from "../_utils/calculations"
import type { AggregatesBlob } from "../_mock/types"

interface TopListsProps {
  aggregates: AggregatesBlob
}

export function TopLists({ aggregates }: TopListsProps) {
  const openDetailsDrawer = useSetAtom(openDetailsDrawerAtom)
  const addFilterChip = useSetAtom(addFilterChipAtom)

  const handleClick = (type: 'ip' | 'path' | 'ua', value: string, data: any) => {
    addFilterChip({ type, label: value, value })
    openDetailsDrawer({ type, data })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Top IPs */}
      <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
        <h3 className="text-sm font-semibold mb-4 text-[#fafafa]">Top IPs by Cost</h3>
        <div className="space-y-3">
          {aggregates.top.ips.slice(0, 5).map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm hover:bg-[#171717] -mx-2 px-2 py-1 rounded cursor-pointer transition-colors"
              onClick={() => handleClick('ip', item.key, item)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-mono text-[#fafafa] truncate">{item.key}</span>
                {item.isBot && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                    BOT
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[#a3a3a3] text-xs">{formatNumber(item.req)}</span>
                <span className="font-semibold text-red-400 w-16 text-right">
                  {formatBytes(item.bytes)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Paths */}
      <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
        <h3 className="text-sm font-semibold mb-4 text-[#fafafa]">Top Paths by Traffic</h3>
        <div className="space-y-3">
          {aggregates.top.paths.slice(0, 5).map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm hover:bg-[#171717] -mx-2 px-2 py-1 rounded cursor-pointer transition-colors"
              onClick={() => handleClick('path', item.key, item)}
            >
              <span className="font-mono text-[#fafafa] truncate flex-1 min-w-0">{item.key}</span>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[#a3a3a3] text-xs">{formatNumber(item.req)}</span>
                <span className={`font-semibold w-16 text-right ${
                  (item.errorRate || 0) > 0.05 ? 'text-red-400' : 'text-[#fafafa]'
                }`}>
                  {formatPercent(item.errorRate || 0, 1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Bots */}
      <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
        <h3 className="text-sm font-semibold mb-4 text-[#fafafa]">Top Bots by Cost</h3>
        <div className="space-y-3">
          {aggregates.top.bots.slice(0, 5).map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm hover:bg-[#171717] -mx-2 px-2 py-1 rounded cursor-pointer transition-colors"
              onClick={() => handleClick('ua', item.key, item)}
            >
              <span className="font-mono text-[#fafafa] truncate flex-1 min-w-0">{item.key}</span>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[#a3a3a3] text-xs">{formatNumber(item.req)}</span>
                <span className="font-semibold text-red-400 w-16 text-right">{formatCurrency(item.costUSD)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
