import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClientFromHeaders, supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  try {
    const supabase = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const orgId = url.searchParams.get('org_id') || ''
    const siteId = url.searchParams.get('site_id') || ''
    const Validation = z.object({ orgId: z.string().uuid(), siteId: z.string().uuid() })
    const parsed = Validation.safeParse({ orgId, siteId })
    if (!parsed.success) return NextResponse.json({ error: 'org_id and site_id required' }, { status: 400 })

    const { data: mem } = await supabaseAdmin
      .from('user_orgs')
      .select('org_id')
      .eq('org_id', orgId)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('aggregates')
      .select('*')
      .eq('org_id', orgId)
      .eq('site_id', siteId)
      .order('window_end', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ aggregate: null })
    return NextResponse.json({ aggregate: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch latest aggregate' }, { status: 400 })
  }
}

