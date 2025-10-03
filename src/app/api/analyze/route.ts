import { NextResponse } from 'next/server'
import { analyze } from '../../../../hoxi-agents/agent/analyzer'

export async function POST(req: Request) {
  try {
    const input = await req.json()
    const report = await analyze(input)
    return NextResponse.json({ reportId: report.reportId, summary: report.metrics, notes: report.notes })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 400 })
  }
}

