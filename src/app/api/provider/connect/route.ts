import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClientFromHeaders, supabaseAdmin } from '@/lib/supabase'
import { encryptString } from '@/lib/crypto'

const BodySchema = z.object({
  org_id: z.string().uuid(),
  site_id: z.string().uuid(),
  provider: z.enum(['vercel','netlify']),
  oauth_code: z.string().optional(),
  redirect_payload: z.any().optional()
})

export async function POST(req: Request) {
  try {
    const supabase = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })

    const { org_id, site_id, provider } = parsed.data

    // Verify membership
    const { data: mem } = await supabaseAdmin
      .from('user_orgs')
      .select('org_id')
      .eq('org_id', org_id)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // TODO: exchange oauth_code for tokens using provider SDK. For MVP store placeholder
    const dummyAccess = encryptString('placeholder_access_token')
    const dummyRefresh = encryptString('placeholder_refresh_token')
    const meta = { created_by: auth.user.id, note: 'placeholder tokens; implement real OAuth exchange' }

    const { error } = await supabaseAdmin
      .from('oauth_connections')
      .insert({ org_id, site_id, provider, access_token_enc: dummyAccess, refresh_token_enc: dummyRefresh, meta })
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'connect failed' }, { status: 400 })
  }
}
