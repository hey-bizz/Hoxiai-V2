import { NextResponse } from 'next/server'
import { getLatestReport } from '../../../../../lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const siteId = searchParams.get('siteId') || ''
    if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    const report = await getLatestReport(siteId)
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 400 })
  }
}

