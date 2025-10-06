"use client"

import { useState } from "react"
import { Provider } from "jotai"
import { HeaderControls } from "./_components/HeaderControls"
import { Sidebar } from "./_components/Sidebar"
import { FilterChips } from "./_components/FilterChips"
import { SavedViewsDropdown } from "./_components/SavedViewsDropdown"
import { KpiRow } from "./_components/KpiRow"
import { TimelineChart } from "./_components/TimelineChart"
import { BotHumanSplit } from "./_components/BotHumanSplit"
import { CostBreakdownTabs } from "./_components/CostBreakdownTabs"
import { AnomaliesTable } from "./_components/AnomaliesTable"
import { UATriageTabs } from "./_components/UATriageTabs"
import { TopLists } from "./_components/TopLists"
import { DetailsDrawer } from "./_components/DetailsDrawer"
import { HoxiChatDrawer, HoxiChatFAB } from "./_components/HoxiChatDrawer"
import { useDashboardData } from "./_hooks/useDashboardData"
import { useOrgAndSite } from "./_hooks/useOrgAndSite"

function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Initialize org and site IDs from Supabase
  useOrgAndSite()

  const { report, aggregates, loading, error } = useDashboardData()

  return (
    <div className="min-h-screen bg-black text-white">
      <HeaderControls sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1920px] mx-auto w-full">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading dashboard data...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Failed to load dashboard</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Empty State - No Data Yet */}
          {!loading && !error && (!report || !aggregates) && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No data yet</h3>
                <p className="text-gray-400 mb-4">Upload your server logs to start analyzing bot traffic and costs</p>
                <a
                  href="/upload"
                  className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Upload Logs
                </a>
              </div>
            </div>
          )}

          {/* Dashboard Content - Only show when data is loaded */}
          {!loading && !error && report && aggregates && (
            <>
              {/* Filter Chips & Saved Views */}
              <div className="flex items-start justify-between mb-6 gap-4">
                <FilterChips />
                <SavedViewsDropdown />
              </div>

          {/* KPI Row */}
          <div className="mb-6">
            <KpiRow report={report} aggregates={aggregates} />
          </div>

          {/* Traffic Timeline */}
          <div className="mb-6">
            <TimelineChart aggregates={aggregates} />
          </div>

          {/* Split Row: Bot vs Human + Cost Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <BotHumanSplit report={report} aggregates={aggregates} />
            <CostBreakdownTabs report={report} />
          </div>

          {/* Anomalies Table */}
          <div className="mb-6">
            <AnomaliesTable report={report} />
          </div>

          {/* New & Unknown UAs */}
          <div className="mb-6">
            <UATriageTabs aggregates={aggregates} />
          </div>

          {/* Top Lists */}
          <div className="mb-6">
            <TopLists aggregates={aggregates} />
          </div>
            </>
          )}
        </main>

        {/* Details Drawer */}
        <DetailsDrawer />

        {/* Hoxi Chat Drawer */}
        <HoxiChatDrawer />
      </div>

      {/* Hoxi Chat FAB */}
      <HoxiChatFAB />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Provider>
      <DashboardContent />
    </Provider>
  )
}
