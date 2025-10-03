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
import { mockReport, mockAggregates } from "./_mock/data"

function DashboardContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-black text-white">
      <HeaderControls sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1920px] mx-auto w-full">
          {/* Filter Chips & Saved Views */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <FilterChips />
            <SavedViewsDropdown />
          </div>

          {/* KPI Row */}
          <div className="mb-6">
            <KpiRow report={mockReport} aggregates={mockAggregates} />
          </div>

          {/* Traffic Timeline */}
          <div className="mb-6">
            <TimelineChart aggregates={mockAggregates} />
          </div>

          {/* Split Row: Bot vs Human + Cost Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <BotHumanSplit report={mockReport} aggregates={mockAggregates} />
            <CostBreakdownTabs report={mockReport} />
          </div>

          {/* Anomalies Table */}
          <div className="mb-6">
            <AnomaliesTable report={mockReport} />
          </div>

          {/* New & Unknown UAs */}
          <div className="mb-6">
            <UATriageTabs aggregates={mockAggregates} />
          </div>

          {/* Top Lists */}
          <div className="mb-6">
            <TopLists aggregates={mockAggregates} />
          </div>
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
