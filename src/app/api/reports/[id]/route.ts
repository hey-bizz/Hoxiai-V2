import { NextResponse } from 'next/server'
import { getReportById } from '../../../../../lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const report = await getReportById(params.id)
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 400 })
  }
}

