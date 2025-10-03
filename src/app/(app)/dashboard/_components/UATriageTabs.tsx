"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatNumber, formatBytes, getRelativeTime, getStatusColor } from "../_utils/calculations"
import type { AggregatesBlob } from "../_mock/types"

interface UATriageTabsProps {
  aggregates: AggregatesBlob
}

type TabType = 'new' | 'unknown'

export function UATriageTabs({ aggregates }: UATriageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('new')

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
      <div className="flex gap-2 mb-6 border-b border-[#262626]">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'new'
              ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]'
              : 'text-[#a3a3a3] hover:text-[#fafafa]'
          }`}
        >
          New User Agents ({aggregates.ua.new.length})
        </button>
        <button
          onClick={() => setActiveTab('unknown')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'unknown'
              ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]'
              : 'text-[#a3a3a3] hover:text-[#fafafa]'
          }`}
        >
          Unknown / Low Confidence ({aggregates.ua.unknown.filter(u => u.status === 'Pending').length})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626] text-left text-xs text-[#a3a3a3]">
              <th className="pb-3 font-medium">User Agent</th>
              <th className="pb-3 font-medium">First Seen</th>
              <th className="pb-3 font-medium">Requests</th>
              <th className="pb-3 font-medium">Bytes</th>
              {activeTab === 'unknown' && (
                <>
                  <th className="pb-3 font-medium">Confidence</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-sm">
            {activeTab === 'new' && aggregates.ua.new.map((ua, index) => (
              <tr key={index} className="border-b border-[#171717] hover:bg-[#171717] transition-colors">
                <td className="py-3 font-mono text-[#fafafa] max-w-xs truncate">{ua.ua}</td>
                <td className="py-3 text-[#a3a3a3]">{getRelativeTime(ua.firstSeen)}</td>
                <td className="py-3 text-[#fafafa]">{formatNumber(ua.req)}</td>
                <td className="py-3 text-[#fafafa]">{formatBytes(ua.bytes)}</td>
              </tr>
            ))}

            {activeTab === 'unknown' && aggregates.ua.unknown.map((ua, index) => (
              <tr key={index} className="border-b border-[#171717] hover:bg-[#171717] transition-colors">
                <td className="py-3 font-mono text-[#fafafa] max-w-xs truncate">{ua.ua}</td>
                <td className="py-3 text-[#a3a3a3]">-</td>
                <td className="py-3 text-[#fafafa]">{formatNumber(ua.req)}</td>
                <td className="py-3 text-[#fafafa]">{formatBytes(ua.bytes)}</td>
                <td className="py-3">
                  <span className={`text-xs ${ua.confidence > 0.7 ? 'text-green-400' : ua.confidence > 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(ua.confidence * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-3">
                  <Badge variant="outline" className={getStatusColor(ua.status || 'Pending')}>
                    {ua.status || 'Pending'}
                  </Badge>
                </td>
                <td className="py-3">
                  {ua.status === 'Pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-[#262626] bg-transparent hover:bg-[#171717]"
                    >
                      Resolve
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
