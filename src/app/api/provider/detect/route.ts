import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClientFromHeaders } from '@/lib/supabase'
import { detectProvider } from '@/lib/detect-provider'

const BodySchema = z.object({ url: z.string().url() })

export async function POST(req: Request) {
  try {
    // Allow anonymous access for provider detection (public endpoint)
    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const result = await detectProvider(parsed.data.url)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[Provider Detect API] Error:', err)
    return NextResponse.json({ error: err?.message || 'detect failed' }, { status: 500 })
  }
}

