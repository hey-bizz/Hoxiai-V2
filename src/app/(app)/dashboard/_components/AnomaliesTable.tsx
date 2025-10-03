"use client"

import { useState } from "react"
import { useSetAtom } from "jotai"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { openDetailsDrawerAtom } from "../_state/useDashboardState"
import { getSeverityColor, getStatusColor, getRelativeTime } from "../_utils/calculations"
import type { AnalysisReport } from "../_mock/types"

interface AnomaliesTableProps {
  report: AnalysisReport
}

type SeverityFilter = 'all' | 'Critical' | 'Warning' | 'Info'
type StatusFilter = 'all' | 'Open' | 'Acknowledged'

export function AnomaliesTable({ report }: AnomaliesTableProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const openDetailsDrawer = useSetAtom(openDetailsDrawerAtom)

  const filteredAnomalies = report.anomalies.filter(anomaly => {
    if (severityFilter !== 'all' && anomaly.severity !== severityFilter) return false
    if (statusFilter !== 'all' && anomaly.status !== statusFilter) return false
    return true
  })

  const criticalCount = report.anomalies.filter(a => a.severity === 'Critical').length

  return (
    <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] p-6 hover:border-[#404040] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#fafafa]">Anomalies Detected</h2>
        {criticalCount > 0 && (
          <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20">
            {criticalCount} Critical
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#a3a3a3]">Severity:</span>
          {(['all', 'Critical', 'Warning', 'Info'] as SeverityFilter[]).map(filter => (
            <Button
              key={filter}
              variant="outline"
              size="sm"
              onClick={() => setSeverityFilter(filter)}
              className={`h-7 text-xs ${
                severityFilter === filter
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6] hover:bg-[#2563eb]'
                  : 'border-[#262626] bg-transparent text-[#a3a3a3] hover:bg-[#171717] hover:text-[#fafafa]'
              }`}
            >
              {filter}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#a3a3a3]">Status:</span>
          {(['all', 'Open', 'Acknowledged'] as StatusFilter[]).map(filter => (
            <Button
              key={filter}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className={`h-7 text-xs ${
                statusFilter === filter
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6] hover:bg-[#2563eb]'
                  : 'border-[#262626] bg-transparent text-[#a3a3a3] hover:bg-[#171717] hover:text-[#fafafa]'
              }`}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626] text-left text-xs text-[#a3a3a3]">
              <th className="pb-3 font-medium">Severity</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium">Entity</th>
              <th className="pb-3 font-medium">First Seen</th>
              <th className="pb-3 font-medium">Evidence</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredAnomalies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#a3a3a3]">
                  No anomalies match the selected filters
                </td>
              </tr>
            ) : (
              filteredAnomalies.map((anomaly, index) => (
                <tr
                  key={index}
                  className="border-b border-[#171717] hover:bg-[#171717] cursor-pointer transition-colors"
                  onClick={() => openDetailsDrawer({ type: 'anomaly', data: anomaly })}
                >
                  <td className="py-3">
                    <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                      {anomaly.severity}
                    </Badge>
                  </td>
                  <td className="py-3 text-[#fafafa]">{anomaly.type}</td>
                  <td className="py-3 font-mono text-[#fafafa]">
                    {anomaly.ip || anomaly.path || 'N/A'}
                  </td>
                  <td className="py-3 text-[#a3a3a3]">{getRelativeTime(anomaly.firstSeen)}</td>
                  <td className="py-3 text-[#a3a3a3]">
                    {anomaly.note || 'See details'}
                  </td>
                  <td className="py-3">
                    <Badge variant="outline" className={getStatusColor(anomaly.status)}>
                      {anomaly.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
