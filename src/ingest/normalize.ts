import { downloadObject } from '@/lib/storage'
import { supabaseAdmin } from '@/lib/supabase'
import { detect, parseCloudfront, parseCsv, parseJsonl } from '@/ingest/parsers'
import { enqueueAggregate } from '@/ingest/aggregate-enqueue'

export async function normalizeUpload(args: { uploadId: string; orgId: string; siteId: string; storageKey: string; providerHint?: string }) {
  try {
    const blob = await downloadObject(args.storageKey)
    const text = await blob.text()
    const sample = text.slice(0, 2000)
    const kind = detect(sample, args.providerHint)

    let iter: AsyncGenerator<any>
    if (kind === 'cloudfront') iter = parseCloudfront(text)
    else if (kind === 'generic-jsonl') iter = parseJsonl(text)
    else iter = parseCsv(text)

    let count = 0
    let minTs: string | null = null
    let maxTs: string | null = null
    const batch: any[] = []
    const BATCH_SIZE = 1000
    let totalBytes: number | undefined = undefined

    for await (const e of iter) {
      count++
      const row = {
        org_id: args.orgId,
        site_id: args.siteId,
        ts: e.ts,
        ip: e.ip || null,
        ua: e.ua || null,
        method: e.method || null,
        path: e.path || null,
        status: e.status ?? null,
        bytes: e.bytes ?? null,
        referer: e.referer || null,
        provider: null
      }
      batch.push(row)
      if (!minTs || e.ts < minTs) minTs = e.ts
      if (!maxTs || e.ts > maxTs) maxTs = e.ts
      if (typeof e.bytes === 'number') totalBytes = (totalBytes || 0) + e.bytes

      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabaseAdmin.from('normalized_entries').insert(batch)
        if (error) throw error
        batch.length = 0
      }
    }
    if (batch.length) {
      const { error } = await supabaseAdmin.from('normalized_entries').insert(batch)
      if (error) throw error
    }

    // Enqueue aggregate placeholder using observed window
    if (minTs && maxTs) await enqueueAggregate(args.orgId, args.siteId, minTs, maxTs)

    return { success: true, inserted: count, bytes: totalBytes, windowStart: minTs || null, windowEnd: maxTs || null }
  } catch (error: any) {
    return { success: false, error: error?.message || 'normalize failed' }
  }
}
