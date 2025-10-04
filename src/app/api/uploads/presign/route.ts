import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin, createServerClientFromHeaders } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const BodySchema = z.object({
  org_id: z.string().uuid(),
  site_id: z.string().uuid(),
  ext: z.string().min(1).max(10),
  bytes: z.number().int().positive().optional(),
  provider_hint: z.string().optional()
})

const BUCKET = 'logs'

async function ensureBucket(client: SupabaseClient, name: string) {
  // Try a cheap list to check existence
  const { error: listErr } = await client.storage.from(name).list('', { limit: 1 })
  if (!listErr) return
  // Attempt to create if missing
  await client.storage.createBucket(name, { public: false }).catch(() => {})
}

export async function POST(req: Request) {
  try {
    // Check if supabaseAdmin is initialized
    if (!supabaseAdmin) {
      console.error('[presign] supabaseAdmin not initialized - check SUPABASE_SERVICE_ROLE_KEY env var')
      return NextResponse.json({ error: 'Server configuration error: Service role key missing' }, { status: 500 })
    }

    const supabaseUser = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabaseUser.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
    }

    const { org_id, site_id, ext, bytes, provider_hint } = parsed.data

    // Verify membership (service role, internal)
    const { data: membership } = await supabaseAdmin
      .from('user_orgs')
      .select('org_id')
      .eq('org_id', org_id)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date()
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const d = String(now.getUTCDate()).padStart(2, '0')
    const h = String(now.getUTCHours()).padStart(2, '0')
    const uuid = randomUUID()
    const storageKey = `logs/${org_id}/${site_id}/${y}/${m}/${d}/${h}/${uuid}.${ext}`

    // Ensure bucket exists, then create signed upload URL (Supabase Storage)
    await ensureBucket(supabaseAdmin, BUCKET)
    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from(BUCKET)
      .createSignedUploadUrl(storageKey)

    if (signErr || !signed) {
      console.error('[presign] Storage error:', signErr)
      return NextResponse.json({ error: signErr?.message || 'Failed to create signed upload URL. Ensure the "logs" bucket exists in Supabase Storage.' }, { status: 500 })
    }

    // Record upload row
    const { data: upload, error: upErr } = await supabaseAdmin
      .from('ingest_uploads')
      .insert({ org_id, site_id, storage_key: storageKey, bytes: bytes ?? null, file_ext: ext, provider_hint: provider_hint || null, status: 'pending' })
      .select('*')
      .single()
    if (upErr) {
      console.error('[presign] Database error:', upErr)
      return NextResponse.json({ error: `Database error: ${upErr.message}. Ensure migrations have been applied.` }, { status: 500 })
    }

    return NextResponse.json({ upload_id: upload.id, storage_key: storageKey, url: signed.signedUrl, token: signed.token })
  } catch (err: any) {
    console.error('[presign] Unexpected error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to presign' }, { status: 500 })
  }
}
