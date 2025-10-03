// Cost Calculation Tool (pure core + small loader)
// Input: provider, totals, breakdown categories, windowDays
// Output: totalCost and per-category monthlyCost using provider price table.

export interface CostBreakdownItem {
  category: string
  bytes: number
}

export interface CostInput {
  provider: string
  totals: { totalBytes: number }
  breakdown: CostBreakdownItem[]
  windowDays?: number
  options?: {
    region?: string
    netlifyPlan?: 'personal' | 'pro' | 'legacy'
    vercelIncludedGB?: number
    useCloudflareArgo?: boolean
  }
}

export interface CostOutputItem {
  category: string
  bytes: number
  monthlyBytes: number
  monthlyCost: number
}

export interface CostOutput {
  currency: string
  totalCost: number
  breakdown: CostOutputItem[]
  notes?: string[]
}

export type PriceTable = any

/**
 * Pure function: compute monthly cost from a provided price table.
 */
export function computeBandwidthCostsFromPriceTable(input: CostInput, priceTable: PriceTable): CostOutput {
  const currency = priceTable?.currency || 'USD'
  const providerKey = normalizeProvider(input.provider)
  const providerTable = priceTable?.providers?.[providerKey]
  if (!providerTable) {
    return {
      currency,
      totalCost: 0,
      breakdown: input.breakdown.map(b => ({ category: b.category, bytes: b.bytes, monthlyBytes: normalizeToMonthly(b.bytes, input.windowDays), monthlyCost: 0 })),
      notes: [`Unknown provider: ${input.provider}. No cost applied.`]
    }
  }

  const monthlyFactor = monthFactor(input.windowDays)
  const breakdownMonthly = input.breakdown.map(b => ({ ...b, monthlyBytes: Math.max(0, Math.round(b.bytes * monthlyFactor)) }))
  const monthlyTotalBytes = Math.max(0, Math.round((input.totals?.totalBytes || sumBytes(input.breakdown)) * monthlyFactor))

  // Determine per-GB rate and free allowances
  const { ratePerGB, freeAllowanceBytes, notes } = determineRate(providerKey, providerTable, input.options)

  // Distribute free allowance proportionally across categories
  const adj = allocateFreeAllowance(breakdownMonthly, freeAllowanceBytes)

  // Compute costs
  const resultItems: CostOutputItem[] = adj.map(item => ({
    category: item.category,
    bytes: item.bytes,
    monthlyBytes: item.monthlyBytes,
    monthlyCost: round2((item.chargeableBytes / 1e9) * ratePerGB)
  }))

  const totalCost = round2(resultItems.reduce((sum, it) => sum + it.monthlyCost, 0))

  const out: CostOutput = {
    currency,
    totalCost,
    breakdown: resultItems,
    notes
  }
  return out
}

/**
 * Convenience wrapper: loads local price_table.json and calls the pure function.
 */
export async function computeBandwidthCosts(input: CostInput): Promise<CostOutput> {
  const fs = await import('fs/promises')
  const raw = await fs.readFile('price_table.json', 'utf8')
  const table = JSON.parse(raw)
  return computeBandwidthCostsFromPriceTable(input, table)
}

// Helpers
function monthFactor(windowDays?: number) {
  if (!windowDays || windowDays <= 0) return 1
  return 30 / windowDays
}

function normalizeToMonthly(bytes: number, windowDays?: number) {
  return Math.max(0, Math.round(bytes * monthFactor(windowDays)))
}

function sumBytes(items: { bytes: number }[]) {
  return items.reduce((s, it) => s + (it.bytes || 0), 0)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function normalizeProvider(p: string): string {
  const key = p.toLowerCase()
  if (key === 'aws' || key === 'cloudfront' || key.includes('cloudfront')) return 'aws_cloudfront'
  return key
}

function determineRate(providerKey: string, providerTable: any, options?: CostInput['options']) {
  const notes: string[] = []
  let ratePerGB = 0
  let freeAllowanceBytes = 0

  switch (providerKey) {
    case 'vercel': {
      const over = providerTable?.bandwidth?.overage_per_gb
      ratePerGB = typeof over === 'number' ? over : 0.40
      const inc = options?.vercelIncludedGB || 0
      if (inc > 0) notes.push(`Vercel included ${inc} GB applied before overage`)
      freeAllowanceBytes = inc * 1e9
      break
    }
    case 'aws_cloudfront': {
      const region = options?.region || 'us_canada_mexico'
      const reg = providerTable?.bandwidth?.regions?.[region]
      ratePerGB = reg?.after_first_tb_per_gb ?? 0.085
      if (providerTable?.bandwidth?.first_1tb_free_per_month) {
        freeAllowanceBytes = 1 * 1024 * 1024 * 1024 * 1024 // 1 TB
        notes.push('CloudFront first 1TB/month free applied')
      }
      break
    }
    case 'netlify': {
      const plan = options?.netlifyPlan || 'legacy'
      if (plan === 'personal') {
        ratePerGB = providerTable?.credit_plans?.effective_bandwidth_usd_per_gb?.personal ?? 0.25
        notes.push('Netlify Personal (credits) rate applied')
      } else if (plan === 'pro') {
        ratePerGB = providerTable?.credit_plans?.effective_bandwidth_usd_per_gb?.pro ?? 0.20
        notes.push('Netlify Pro (credits) rate applied')
      } else {
        ratePerGB = providerTable?.legacy_overage?.effective_per_gb ?? 0.55
        notes.push('Netlify legacy overage rate applied')
      }
      break
    }
    case 'cloudflare': {
      const useArgo = !!options?.useCloudflareArgo
      if (useArgo) {
        ratePerGB = providerTable?.argo_smart_routing?.per_gb ?? 0.10
        notes.push('Cloudflare Argo Smart Routing per-GB applied')
      } else {
        ratePerGB = providerTable?.cdn?.per_gb ?? 0
        notes.push('Cloudflare self-serve CDN bandwidth not metered (per GB = $0)')
      }
      break
    }
    default: {
      ratePerGB = 0.10
      notes.push(`Default generic rate applied for ${providerKey}`)
    }
  }

  return { ratePerGB, freeAllowanceBytes, notes }
}

function allocateFreeAllowance(
  items: Array<CostBreakdownItem & { monthlyBytes: number }>,
  freeAllowanceBytes: number
) {
  const totalMonthly = items.reduce((s, it) => s + it.monthlyBytes, 0)
  if (!freeAllowanceBytes || freeAllowanceBytes <= 0 || totalMonthly <= 0) {
    return items.map(it => ({ ...it, chargeableBytes: it.monthlyBytes }))
  }

  // Proportional allocation of free allowance across categories
  let remaining = freeAllowanceBytes
  return items.map(it => {
    const share = (it.monthlyBytes / totalMonthly) * freeAllowanceBytes
    const applied = Math.min(it.monthlyBytes, Math.round(share))
    remaining -= applied
    const chargeable = Math.max(0, it.monthlyBytes - applied)
    return { ...it, chargeableBytes: chargeable }
  })
}

