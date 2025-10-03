"use client"

import { useAtom } from "jotai"
import Link from "next/link"
import Image from "next/image"
import { Bell, User, RefreshCw, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { timeRangeAtom, autoRefreshAtom, type TimeRange, type AutoRefresh } from "../_state/useDashboardState"

interface HeaderControlsProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function HeaderControls({ sidebarOpen, onToggleSidebar }: HeaderControlsProps) {
  const [timeRange, setTimeRange] = useAtom(timeRangeAtom)
  const [autoRefresh, setAutoRefresh] = useAtom(autoRefreshAtom)

  return (
    <header className="sticky top-0 z-40 border-b border-[#262626] bg-black/95 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 hover:bg-[#171717] lg:hidden transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/hoxi-logo.png" alt="Hoxi" width={32} height={32} className="h-8 w-8" />
          <span className="text-xl font-bold hidden sm:inline text-[#fafafa]">Hoxi</span>
        </Link>

        {/* Controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Org Selector */}
          <select
            className="h-9 rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 hover:border-[#404040] transition-colors"
            aria-label="Select organization"
          >
            <option>Production</option>
            <option>Staging</option>
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="h-9 rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 hover:border-[#404040] transition-colors"
            aria-label="Select time range"
          >
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="custom">Custom range</option>
          </select>

          {/* Auto Refresh */}
          <select
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.value as AutoRefresh)}
            className="h-9 rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 text-sm text-[#fafafa] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/20 hover:border-[#404040] transition-colors hidden sm:block"
            aria-label="Auto refresh interval"
          >
            <option value="live">Live</option>
            <option value="30s">30s</option>
            <option value="off">Off</option>
          </select>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex hover:bg-[#171717]"
            aria-label="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="hover:bg-[#171717]" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <Button variant="ghost" size="icon" className="hover:bg-[#171717]" aria-label="User menu">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
