"use client"

import { useSetAtom } from "jotai"
import { ChevronDown } from "lucide-react"
import { applySavedViewAtom, type SavedView } from "../_state/useDashboardState"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function SavedViewsDropdown() {
  const applySavedView = useSetAtom(applySavedViewAtom)

  const views: { id: SavedView; label: string; description: string }[] = [
    { id: 'live-ops', label: 'Live Ops', description: 'Real-time monitoring, 1h window' },
    { id: 'cost-review', label: 'Cost Review', description: 'Bandwidth & cost analysis, 24h' },
    { id: 'security-sweep', label: 'Security Sweep', description: 'Anomalies & threats, 24h' },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-[#262626] bg-transparent hover:bg-[#171717] text-[#fafafa]"
        >
          Saved Views
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border-[#262626] bg-[#0a0a0a] text-[#fafafa]"
      >
        {views.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => applySavedView(view.id)}
            className="cursor-pointer hover:bg-[#171717] focus:bg-[#171717]"
          >
            <div>
              <div className="font-medium">{view.label}</div>
              <div className="text-xs text-[#a3a3a3] mt-0.5">{view.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
