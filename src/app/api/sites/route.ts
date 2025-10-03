import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClientFromHeaders, supabaseAdmin } from '@/lib/supabase'

const CreateSiteSchema = z.object({
  org_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  domain: z.string().min(3).max(255).optional()
})

export async function GET(req: Request) {
  try {
    const supabase = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const orgId = url.searchParams.get('org_id') || req.headers.get('x-org-id') || ''
    if (!orgId) return NextResponse.json({ error: 'org_id is required' }, { status: 400 })

    // Verify membership using service role (internal check only)
    const { data: mem } = await supabaseAdmin
      .from('user_orgs')
      .select('org_id')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // List sites (RLS also applies if using user client)
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ sites: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list sites' }, { status: 400 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json().catch(() => ({}))
    const parse = CreateSiteSchema.safeParse(json)
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid body', details: parse.error.flatten() }, { status: 400 })
    }

    // Verify membership
    const { data: mem } = await supabaseAdmin
      .from('user_orgs')
      .select('org_id')
      .eq('org_id', parse.data.org_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!mem) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Create site
    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .insert({ org_id: parse.data.org_id, name: parse.data.name, domain: parse.data.domain || null })
      .select('*')
      .single()
    if (error) throw error

    return NextResponse.json({ site })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create site' }, { status: 400 })
  }
}

