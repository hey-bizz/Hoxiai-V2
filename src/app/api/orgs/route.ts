import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClientFromHeaders, supabaseAdmin } from '@/lib/supabase'

const CreateOrgSchema = z.object({ name: z.string().min(2).max(100) })

export async function GET(req: Request) {
  try {
    const supabase = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // RLS will enforce membership when selecting from orgs
    const { data, error } = await supabase
      .from('orgs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ orgs: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list orgs' }, { status: 400 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClientFromHeaders(new Headers(req.headers))
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const json = await req.json().catch(() => ({}))
    const parse = CreateOrgSchema.safeParse(json)
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid body', details: parse.error.flatten() }, { status: 400 })
    }

    // Insert org (service role; creation uses created_by = user.id)
    const { data: org, error } = await supabaseAdmin
      .from('orgs')
      .insert({ name: parse.data.name, created_by: user.id })
      .select('*')
      .single()

    if (error) throw error

    // Ensure membership as owner
    const { error: memberErr } = await supabaseAdmin
      .from('user_orgs')
      .upsert({ user_id: user.id, org_id: org.id, role: 'owner' })
    if (memberErr) throw memberErr

    return NextResponse.json({ org })
  } catch (err: any) {
    const msg = err?.message || 'Failed to create org'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

