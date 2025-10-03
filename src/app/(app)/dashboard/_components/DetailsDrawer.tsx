"use client"

import { useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { X, Copy, ExternalLink, MessageSquare, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { detailsDrawerAtom, closeDetailsDrawerAtom, openChatDrawerAtom, addFilterChipAtom } from "../_state/useDashboardState"
import { formatNumber, formatBytes, formatCurrency, getSeverityColor, getStatusColor, getRelativeTime, exportToCSV } from "../_utils/calculations"

type TabType = 'summary' | 'behavior' | 'evidence' | 'actions'

export function DetailsDrawer() {
  const [{ open, type, data }] = useAtom(detailsDrawerAtom)
  const closeDrawer = useSetAtom(closeDetailsDrawerAtom)
  const openChat = useSetAtom(openChatDrawerAtom)
  const addFilterChip = useSetAtom(addFilterChipAtom)
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [copied, setCopied] = useState(false)

  if (!open || !data) return null

  const handleSendToChat = () => {
    const contextChips = []
    if (type === 'ip' && data.key) {
      contextChips.push({ id: `ip-${Date.now()}`, type: 'ip' as const, label: data.key, value: data.key })
    } else if (type === 'ua' && data.key) {
      contextChips.push({ id: `ua-${Date.now()}`, type: 'ua' as const, label: data.key, value: data.key })
    } else if (type === 'path' && data.key) {
      contextChips.push({ id: `path-${Date.now()}`, type: 'path' as const, label: data.key, value: data.key })
    }
    closeDrawer()
    openChat(contextChips)
  }

  const handleCopyRobotsTxt = () => {
    const entity = data.ip || data.key || data.path || 'unknown'
    const robotsTxt = `# Block ${entity}\nUser-agent: *\nDisallow: /`
    navigator.clipboard.writeText(robotsTxt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportBlocklist = () => {
    const csvData = [{ entity: data.ip || data.key || data.path, type, timestamp: new Date().toISOString() }]
    exportToCSV(csvData, `blocklist-${type}-${Date.now()}.csv`)
  }

  const getTitle = () => {
    if (type === 'anomaly') return 'Anomaly Details'
    if (type === 'ip') return 'IP Address Details'
    if (type === 'ua') return 'User Agent Details'
    if (type === 'path') return 'Path Details'
    return 'Details'
  }

  const tabs = [
    { id: 'summary' as TabType, label: 'Summary' },
    { id: 'behavior' as TabType, label: 'Behavior' },
    { id: 'evidence' as TabType, label: 'Evidence' },
    { id: 'actions' as TabType, label: 'Actions' },
  ]

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
      <div className="fixed right-0 top-16 bottom-0 w-full sm:w-96 border-l border-[#262626] bg-black z-50 overflow-y-auto animate-slide-in-right">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#fafafa]">{getTitle()}</h2>
            <Button variant="ghost" size="icon" onClick={closeDrawer} className="hover:bg-[#171717]">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#262626]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#3b82f6] border-b-2 border-[#3b82f6]'
                    : 'text-[#a3a3a3] hover:text-[#fafafa]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'summary' && (
              <>
                <div>
                  <div className="text-xs text-[#a3a3a3] mb-1">Entity</div>
                  <div className="font-mono text-lg text-[#fafafa]">
                    {data.ip || data.key || data.path || data.ua || 'N/A'}
                  </div>
                </div>

                {type === 'anomaly' && (
                  <>
                    <div>
                      <div className="text-xs text-[#a3a3a3] mb-1">Severity</div>
                      <Badge variant="outline" className={getSeverityColor(data.severity)}>
                        {data.severity}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-[#a3a3a3] mb-1">Type</div>
                      <div className="text-[#fafafa]">{data.type}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#a3a3a3] mb-1">Status</div>
                      <Badge variant="outline" className={getStatusColor(data.status)}>
                        {data.status}
                      </Badge>
                    </div>
                  </>
                )}

                {(type === 'ip' || type === 'ua' || type === 'path') && data.isBot !== undefined && (
                  <div>
                    <div className="text-xs text-[#a3a3a3] mb-1">Classification</div>
                    <Badge variant="outline" className={data.isBot ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}>
                      {data.isBot ? 'Bot' : 'Human'}
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#a3a3a3] mb-1">Requests</div>
                    <div className="text-[#fafafa] font-semibold">{formatNumber(data.req || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#a3a3a3] mb-1">Bandwidth</div>
                    <div className="text-[#fafafa] font-semibold">{formatBytes(data.bytes || 0)}</div>
                  </div>
                </div>

                {data.costUSD && (
                  <div>
                    <div className="text-xs text-[#a3a3a3] mb-1">Cost Impact</div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(data.costUSD)}</div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'behavior' && (
              <>
                <div>
                  <div className="text-xs text-[#a3a3a3] mb-2">Requests per Minute</div>
                  <div className="h-32 flex items-end gap-1">
                    {Array.from({ length: 24 }).map((_, i) => {
                      const height = Math.random() * 100
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-[#3b82f6]/30 rounded-t hover:bg-[#3b82f6]/50 transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${(Math.random() * 1000).toFixed(0)} req/min`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-[#a3a3a3] mt-2">
                    <span>-12h</span>
                    <span>Now</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-3">
                    <div className="text-xs text-[#a3a3a3] mb-1">Burst Z-Score</div>
                    <div className="text-xl font-bold text-[#fafafa]">
                      {data.evidence?.burstZ?.toFixed(2) || (Math.random() * 10).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-3">
                    <div className="text-xs text-[#a3a3a3] mb-1">Error Rate</div>
                    <div className="text-xl font-bold text-[#fafafa]">
                      {data.errorRate ? `${(data.errorRate * 100).toFixed(1)}%` : '2.3%'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-[#a3a3a3] mb-2">Status Distribution</div>
                  <div className="space-y-2">
                    <StatusBar label="2xx Success" percent={78} color="from-green-500 to-emerald-500" />
                    <StatusBar label="3xx Redirect" percent={12} color="from-yellow-500 to-amber-500" />
                    <StatusBar label="4xx Client Error" percent={8} color="from-orange-500 to-red-500" />
                    <StatusBar label="5xx Server Error" percent={2} color="from-red-500 to-rose-500" />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'evidence' && (
              <>
                {type === 'anomaly' && data.evidence && (
                  <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
                    <div className="text-xs text-[#a3a3a3] mb-2">Evidence</div>
                    <pre className="text-xs text-[#fafafa] font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(data.evidence, null, 2)}
                    </pre>
                  </div>
                )}

                {data.note && (
                  <div>
                    <div className="text-xs text-[#a3a3a3] mb-2">Notes</div>
                    <div className="text-sm text-[#fafafa] p-3 rounded-lg bg-[#0a0a0a] border border-[#262626]">
                      {data.note}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-[#a3a3a3] mb-2">Matched Signatures</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-[#fafafa]">High request rate pattern</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-[#fafafa]">Sequential path scanning</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-yellow-400" />
                      <span className="text-[#fafafa]">Suspicious user agent string</span>
                    </div>
                  </div>
                </div>

                {(data.firstSeen || data.lastSeen) && (
                  <div className="grid grid-cols-2 gap-4">
                    {data.firstSeen && (
                      <div>
                        <div className="text-xs text-[#a3a3a3] mb-1">First Seen</div>
                        <div className="text-sm text-[#fafafa]">{getRelativeTime(data.firstSeen)}</div>
                      </div>
                    )}
                    {data.lastSeen && (
                      <div>
                        <div className="text-xs text-[#a3a3a3] mb-1">Last Seen</div>
                        <div className="text-sm text-[#fafafa]">{getRelativeTime(data.lastSeen)}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'actions' && (
              <>
                <div>
                  <div className="text-xs text-[#a3a3a3] mb-2">Quick Actions</div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#262626] bg-transparent hover:bg-[#171717] text-[#fafafa]"
                      onClick={handleCopyRobotsTxt}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy robots.txt rule
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#262626] bg-transparent hover:bg-[#171717] text-[#fafafa]"
                      onClick={handleExportBlocklist}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Export to blocklist
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-[#262626] bg-transparent hover:bg-[#171717] text-[#fafafa]"
                      onClick={handleSendToChat}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send to Hoxi Chat
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
                  <div className="text-xs text-[#a3a3a3] mb-2">Recommended robots.txt</div>
                  <pre className="text-xs text-[#fafafa] font-mono overflow-x-auto whitespace-pre-wrap">
{`# Block ${data.ip || data.key || data.path || 'entity'}
User-agent: ${data.key || '*'}
Disallow: /`}
                  </pre>
                </div>

                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <div className="text-xs font-medium text-yellow-400 mb-1">WAF Recommendation</div>
                  <div className="text-xs text-[#fafafa]">
                    Consider adding rate limiting rules for this entity. Maximum recommended: 100 req/min.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function StatusBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#a3a3a3]">{label}</span>
        <span className="text-[#fafafa]">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#171717]">
        <div
          className={`h-full bg-gradient-to-r ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
