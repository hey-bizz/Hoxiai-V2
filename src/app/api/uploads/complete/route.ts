import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClientFromHeaders, supabaseAdmin } from '@/lib/supabase'
import { normalizeUpload } from '@/ingest/normalize'
import { analyze } from '../../../../../hoxi-agents/agent/analyzer'

const BodySchema = z.object({ upload_id: z.string().uuid() })

export async function POST(req: Request) {
  try {
    const supabase = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })

    const uploadId = parsed.data.upload_id
    // Load upload row and verify membership
    const { data: upload, error } = await supabaseAdmin
      .from('ingest_uploads')
      .select('*')
      .eq('id', uploadId)
      .maybeSingle()
    if (error || !upload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 })

    const { data: mem } = await supabaseAdmin
      .from('user_orgs')
      .select('org_id')
      .eq('org_id', upload.org_id)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Set status parsing
    await supabaseAdmin.from('ingest_uploads').update({ status: 'parsing' }).eq('id', uploadId)

    // Normalize now (MVP synchronous)
    const result = await normalizeUpload({
      uploadId,
      orgId: upload.org_id,
      siteId: upload.site_id,
      storageKey: upload.storage_key,
      providerHint: upload.provider_hint || undefined
    })

    // Mark done or error
    if (result.success) {
      await supabaseAdmin.from('ingest_uploads').update({ status: 'done', bytes: result.bytes ?? upload.bytes }).eq('id', uploadId)

      // Kick off analysis immediately for the observed window (MVP synchronous)
      const start = result.windowStart || new Date(Date.now() - 24*60*60*1000).toISOString()
      const end = result.windowEnd || new Date().toISOString()
      // Provider guess from hint, default to cloudflare
      const providerMap: Record<string, any> = { cloudfront: 'aws', aws: 'aws', cloudflare: 'cloudflare', vercel: 'vercel', netlify: 'netlify' }
      const provider = providerMap[(upload.provider_hint || '').toLowerCase()] || 'cloudflare'

      try {
        const report = await analyze({
          orgId: upload.org_id,
          siteId: upload.site_id,
          provider,
          window: { start, end },
          dataRef: { db: { orgId: upload.org_id, siteId: upload.site_id, start, end } },
          options: { useWebSearch: false, debug: false }
        })
        return NextResponse.json({ ok: true, normalized: result.inserted, reportId: report.reportId, window: { start, end } })
      } catch (e: any) {
        // Non-fatal; normalization succeeded.
        console.error('[Uploads Complete] analyze failed:', e?.message || e)
        return NextResponse.json({ ok: true, normalized: result.inserted, window: { start, end }, note: 'analyze failed; see logs' })
      }
    } else {
      await supabaseAdmin.from('ingest_uploads').update({ status: 'error', error_text: result.error || 'normalize failed' }).eq('id', uploadId)
      return NextResponse.json({ error: result.error || 'normalize failed' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to complete upload' }, { status: 400 })
  }
}
