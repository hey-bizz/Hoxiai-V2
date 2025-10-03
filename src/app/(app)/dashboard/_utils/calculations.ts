export function bytesToGB(bytes: number): number {
  return bytes / 1024 / 1024 / 1024
}

export function formatBytes(bytes: number): string {
  const gb = bytesToGB(bytes)
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`
  }
  const mb = bytes / 1024 / 1024
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`
  }
  const kb = bytes / 1024
  return `${kb.toFixed(1)} KB`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function formatCurrency(usd: number): string {
  return `$${usd.toFixed(2)}`
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

export function calculateZScore(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
  const std = Math.sqrt(variance)
  const max = Math.max(...values)
  if (std === 0) return 0
  return (max - mean) / std
}

export function calculateRollingMean(values: number[], window: number): number[] {
  const result: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    const windowValues = values.slice(start, i + 1)
    const mean = windowValues.reduce((a, b) => a + b, 0) / windowValues.length
    result.push(mean)
  }
  return result
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header]
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getSeverityColor(severity: 'Info' | 'Warning' | 'Critical'): string {
  switch (severity) {
    case 'Critical':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'Warning':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'Info':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  }
}

export function getStatusColor(status: 'Open' | 'Acknowledged' | 'Pending' | 'Resolved'): string {
  switch (status) {
    case 'Open':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'Acknowledged':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'Pending':
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    case 'Resolved':
      return 'bg-green-500/10 text-green-400 border-green-500/20'
  }
}
