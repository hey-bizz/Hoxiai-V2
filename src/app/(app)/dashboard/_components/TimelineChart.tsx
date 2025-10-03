"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush } from "recharts"
import { useAtom } from "jotai"
import { chartModeAtom, type ChartMode } from "../_state/useDashboardState"
import { formatBytes, formatNumber, formatDate } from "../_utils/calculations"
import type { AggregatesBlob } from "../_mock/types"
import { Button } from "@/components/ui/button"

interface TimelineChartProps {
  aggregates: AggregatesBlob
}

export function TimelineChart({ aggregates }: TimelineChartProps) {
  const [chartMode, setChartMode] = useAtom(chartModeAtom)
  const [isLive] = useState(true)

  const chartData = aggregates.buckets.map(bucket => ({
    time: new Date(bucket.ts).getTime(),
    timeLabel: formatDate(bucket.ts),
    human: chartMode === 'requests' ? bucket.humanReq : bucket.humanBytes,
    bot: chartMode === 'requests' ? bucket.botReq : bucket.botBytes,
  }))

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[#fafafa]">Traffic Timeline</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-xs text-[#a3a3a3]">{isLive ? 'Live' : 'Paused'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={chartMode === 'requests' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartMode('requests')}
              className={chartMode === 'requests' ? 'bg-[#3b82f6] hover:bg-[#2563eb]' : 'border-[#262626] bg-transparent hover:bg-[#171717]'}
            >
              Requests
            </Button>
            <Button
              variant={chartMode === 'bytes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartMode('bytes')}
              className={chartMode === 'bytes' ? 'bg-[#3b82f6] hover:bg-[#2563eb]' : 'border-[#262626] bg-transparent hover:bg-[#171717]'}
            >
              Bytes
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-[#3b82f6]" />
              <span className="text-[#a3a3a3]">Human</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-[#ef4444]" />
              <span className="text-[#a3a3a3]">Bot</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorHuman" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              stroke="#a3a3a3"
              tick={{ fill: '#a3a3a3', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value) => chartMode === 'bytes' ? formatBytes(value) : formatNumber(value)}
              stroke="#a3a3a3"
              tick={{ fill: '#a3a3a3', fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-3 shadow-xl">
                      <div className="text-xs text-[#a3a3a3] mb-2">{data.timeLabel}</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                            <span className="text-sm text-[#fafafa]">Human</span>
                          </div>
                          <span className="text-sm font-mono text-[#fafafa]">
                            {chartMode === 'bytes' ? formatBytes(data.human) : formatNumber(data.human)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
                            <span className="text-sm text-[#fafafa]">Bot</span>
                          </div>
                          <span className="text-sm font-mono text-[#fafafa]">
                            {chartMode === 'bytes' ? formatBytes(data.bot) : formatNumber(data.bot)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="human"
              stackId="1"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorHuman)"
            />
            <Area
              type="monotone"
              dataKey="bot"
              stackId="1"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorBot)"
            />
            <Brush
              dataKey="time"
              height={30}
              stroke="#3b82f6"
              fill="#0a0a0a"
              tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit' })}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
