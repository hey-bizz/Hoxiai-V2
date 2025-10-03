"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Activity, Upload, Settings } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
}

export function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/reports", label: "Reports", icon: Activity },
    { href: "/upload", label: "Upload Logs", icon: Upload },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <aside
      className={`${
        isOpen ? "w-56" : "w-0"
      } fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] overflow-hidden border-r border-[#262626] bg-black transition-all duration-300 lg:w-56`}
    >
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#171717] text-[#3b82f6] border-l-2 border-[#3b82f6]"
                  : "text-[#a3a3a3] hover:bg-[#171717] hover:text-[#fafafa]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
