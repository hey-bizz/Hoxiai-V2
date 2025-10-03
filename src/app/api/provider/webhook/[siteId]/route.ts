import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(_req: Request, { params }: { params: { siteId: string } }) {
  try {
    const siteId = params.siteId
    // TODO: verify signature using secret in oauth_connections.meta
    // For MVP, accept and store a tiny marker row in ingest_raw

    // Resolve org_id for site
    const { data: site, error: siteErr } = await supabaseAdmin.from('sites').select('org_id').eq('id', siteId).single()
    if (siteErr || !site) return NextResponse.json({ error: 'site not found' }, { status: 404 })

    const storageKey = `logs/${site.org_id}/${siteId}/webhooks/${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`
    // In a real implementation, we'd write the request body to storage key; skipped here
    const { error } = await supabaseAdmin.from('ingest_raw').insert({ org_id: site.org_id, site_id: siteId, source: 'oauth', storage_key: storageKey })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'webhook failed' }, { status: 400 })
  }
}

