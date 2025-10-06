"use client"

import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { orgIdAtom, siteIdAtom, effectiveTimeWindowAtom } from '../_state/useDashboardState'
import { createBrowserClient } from '@/lib/supabase'
import type { AnalysisReport, AggregatesBlob } from '../_mock/types'

interface DashboardData {
  report: AnalysisReport | null
  aggregates: AggregatesBlob | null
  loading: boolean
  error: string | null
}

export function useDashboardData(): DashboardData {
  const orgId = useAtomValue(orgIdAtom)
  const siteId = useAtomValue(siteIdAtom)
  const timeWindow = useAtomValue(effectiveTimeWindowAtom)

  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [aggregates, setAggregates] = useState<AggregatesBlob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          setError('Not authenticated')
          return
        }

        // Fetch latest report
        const reportRes = await fetch(`/api/reports/latest?siteId=${siteId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!reportRes.ok) {
          if (reportRes.status === 404) {
            // No report yet - user hasn't uploaded logs
            setReport(null)
          } else {
            throw new Error('Failed to fetch report')
          }
        } else {
          const reportData = await reportRes.json()
          if (!cancelled) {
            setReport(reportData)
          }
        }

        // Fetch latest aggregates
        const aggRes = await fetch(`/api/aggregates/latest?org_id=${orgId}&site_id=${siteId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!aggRes.ok) {
          if (aggRes.status === 404) {
            setAggregates(null)
          } else {
            throw new Error('Failed to fetch aggregates')
          }
        } else {
          const aggData = await aggRes.json()
          if (!cancelled && aggData.aggregate?.data) {
            setAggregates(aggData.aggregate.data)
          }
        }

      } catch (err: any) {
        if (!cancelled) {
          console.error('[useDashboardData] Error:', err)
          setError(err.message || 'Failed to fetch dashboard data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (orgId && siteId) {
      fetchData()
    }

    return () => {
      cancelled = true
    }
  }, [orgId, siteId, timeWindow])

  return { report, aggregates, loading, error }
}
