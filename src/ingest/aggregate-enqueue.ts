import { supabaseAdmin } from '@/lib/supabase'

export async function enqueueAggregate(orgId: string, siteId: string, windowStart: string, windowEnd: string) {
  const placeholder = { note: 'aggregate pending', windowStart, windowEnd }
  // Upsert-like behavior using unique index (org,site,window)
  const { error } = await supabaseAdmin
    .from('aggregates')
    .upsert({ org_id: orgId, site_id: siteId, window_start: windowStart, window_end: windowEnd, data: placeholder }, { onConflict: 'org_id,site_id,window_start,window_end' })
  if (error) throw error
}

