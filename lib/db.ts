import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.SUPABASE_SERVICE_KEY as string)
  if (!url || !serviceKey) {
    throw new Error('Supabase env missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) are required')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function upsertAnalysisReport(report: any) {
  const supabase = getSupabaseClient()
  const row = {
    report_id: report.reportId,
    org_id: report.orgId || null,
    site_id: report.siteId,
    window_start: report.window.start,
    window_end: report.window.end,
    provider: report.provider,
    report_json: report
  }
  const { error } = await supabase.from('analysis_reports').upsert(row, { onConflict: 'site_id,window_start,window_end', ignoreDuplicates: false })
  if (error) throw error
}

export async function getReportById(reportId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('analysis_reports').select('report_json').eq('report_id', reportId).single()
  if (error) throw error
  return data?.report_json
}

export async function getLatestReport(siteId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('analysis_reports')
    .select('report_json')
    .eq('site_id', siteId)
    .order('window_end', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.report_json
}

export async function getPriceTableVersion(): Promise<string> {
  try {
    const raw = await fs.readFile('price_table.json', 'utf8')
    const json = JSON.parse(raw)
    return json?.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

