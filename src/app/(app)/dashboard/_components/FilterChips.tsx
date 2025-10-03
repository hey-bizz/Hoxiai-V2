"use client"

import { useAtom, useSetAtom } from "jotai"
import { X } from "lucide-react"
import { filterChipsAtom, removeFilterChipAtom, clearFilterChipsAtom } from "../_state/useDashboardState"
import { Button } from "@/components/ui/button"

export function FilterChips() {
  const [chips] = useAtom(filterChipsAtom)
  const removeChip = useSetAtom(removeFilterChipAtom)
  const clearAll = useSetAtom(clearFilterChipsAtom)

  if (chips.length === 0) return null

  const getChipColor = (type: string) => {
    switch (type) {
      case 'ip':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'ua':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'path':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'time':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <span className="text-xs text-[#a3a3a3]">Active filters:</span>
      {chips.map((chip) => (
        <div
          key={chip.id}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getChipColor(chip.type)}`}
        >
          <span className="uppercase text-[10px] opacity-60">{chip.type}</span>
          <span>{chip.label}</span>
          <button
            onClick={() => removeChip(chip.id)}
            className="hover:opacity-70 transition-opacity"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-6 text-xs text-[#a3a3a3] hover:text-[#fafafa] hover:bg-[#171717]"
        >
          Clear all
        </Button>
      )}
    </div>
  )
}
