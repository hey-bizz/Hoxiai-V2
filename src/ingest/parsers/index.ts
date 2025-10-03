export type ParsedEntry = {
  ts: string
  ip?: string
  ua?: string
  method?: string
  path?: string
  status?: number
  bytes?: number
  referer?: string
}

export type ParserKind = 'cloudfront' | 'generic-jsonl' | 'generic-csv'

export function detect(contentSample: string, providerHint?: string): ParserKind {
  if (providerHint && providerHint.toLowerCase().includes('cloudfront')) return 'cloudfront'
  // basic heuristics
  if (/^#\s?Version:/.test(contentSample) || /\t/.test(contentSample) || /cs-uri-stem/.test(contentSample)) return 'cloudfront'
  if (contentSample.trim().startsWith('{') || contentSample.includes('\n{')) return 'generic-jsonl'
  return 'generic-csv'
}

export async function* parseCloudfront(text: string): AsyncGenerator<ParsedEntry> {
  // CloudFront standard log (space-delimited with header lines starting with #)
  // Fields reference: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html#LogFileFormat
  const lines = text.split(/\r?\n/)
  let header: string[] | null = null
  for (const line of lines) {
    if (!line) continue
    if (line.startsWith('#')) {
      if (line.startsWith('#Fields:')) {
        header = line.replace('#Fields:', '').trim().split(/\s+/)
      }
      continue
    }
    const parts = line.split(/\s+/)
    if (!header) continue
    const map = Object.fromEntries(header.map((h, i) => [h, parts[i] ?? ''])) as any
    const date = map['date']
    const time = map['time']
    const ts = new Date(`${date}T${time}Z`).toISOString()
    const ip = map['c-ip'] || undefined
    const ua = (map['cs(User-Agent)'] || map['cs(User-Agent)'] || '').replace(/\+/g, ' ')
    const method = map['cs-method'] || map['cs(Method)'] || undefined
    const path = map['cs-uri-stem'] || map['cs-uri'] || undefined
    const status = Number(map['sc-status'] || map['sc-status'] || 0) || undefined
    const bytes = Number(map['sc-bytes'] || 0) || undefined
    const referer = map['cs(Referer)'] || undefined
    yield { ts, ip, ua, method, path, status, bytes, referer }
  }
}

export async function* parseJsonl(text: string): AsyncGenerator<ParsedEntry> {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const s = line.trim()
    if (!s) continue
    try {
      const o = JSON.parse(s)
      const ts = new Date(o.timestamp || o.ts || o.time || Date.now()).toISOString()
      const ip = o.ip || o.client_ip || o.remote_addr || undefined
      const ua = o.user_agent || o.userAgent || o.ua || undefined
      const method = o.method || o.verb || undefined
      const path = o.path || o.url || o.uri || undefined
      const status = Number(o.status || o.status_code || o.response_code || 0) || undefined
      const bytes = Number(o.bytes || o.size || o.response_size || 0) || undefined
      const referer = o.referer || o.referrer || undefined
      yield { ts, ip, ua, method, path, status, bytes, referer }
    } catch {
      // skip
    }
  }
}

function csvSafeSplit(line: string): string[] {
  const res: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; continue }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) { res.push(cur); cur = ''; continue }
    cur += ch
  }
  res.push(cur)
  return res
}

export async function* parseCsv(text: string): AsyncGenerator<ParsedEntry> {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return
  const header = csvSafeSplit(lines[0]).map(s => s.trim().toLowerCase())
  const idx = Object.fromEntries(header.map((h, i) => [h, i])) as Record<string, number>
  const get = (parts: string[], k: string) => {
    const i = idx[k]
    return i != null ? parts[i] : ''
  }
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]
    const parts = csvSafeSplit(raw)
    const tsRaw = get(parts, 'timestamp') || get(parts, 'ts') || get(parts, 'time') || get(parts, 'date') || ''
    const ts = tsRaw ? new Date(tsRaw).toISOString() : new Date().toISOString()
    const ip = get(parts, 'ip') || get(parts, 'client_ip') || get(parts, 'remote_addr') || get(parts, 'http_x_forwarded_for') || get(parts, 'user_ip')
    const ua = get(parts, 'user_agent') || get(parts, 'ua') || get(parts, 'http_user_agent')
    const method = get(parts, 'method') || get(parts, 'verb') || get(parts, 'request_type')
    const path = get(parts, 'path') || get(parts, 'url') || get(parts, 'uri') || get(parts, 'request_url')
    const status = Number(get(parts, 'status') || get(parts, 'status_code') || get(parts, 'response_code') || 0) || undefined
    const bytes = Number(get(parts, 'bytes') || get(parts, 'size') || get(parts, 'response_size') || get(parts, 'body_bytes_sent') || 0) || undefined
    const referer = get(parts, 'referer') || get(parts, 'referrer') || get(parts, 'http_referer')
    yield { ts, ip, ua, method, path, status, bytes, referer }
  }
}
