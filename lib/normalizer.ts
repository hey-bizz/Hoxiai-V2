// Enhanced Log Normalizer - Generates consistent fingerprints and session IDs
// Converts provider-specific logs to DetectionLogEntry format

import { createHash } from 'crypto'
import { NormalizedLog } from './integrations/base'
import { DetectionLogEntry } from './types'

export class LogNormalizer {
  private sessionCache: Map<string, string> = new Map()
  private sessionCounter: Map<string, number> = new Map()

  /**
   * Convert NormalizedLog to DetectionLogEntry with fingerprints and session IDs
   */
  normalize(logs: NormalizedLog[], websiteId: string): DetectionLogEntry[] {
    // Clear session cache for fresh analysis
    this.sessionCache.clear()
    this.sessionCounter.clear()

    // Sort logs by timestamp to ensure proper session grouping
    const sortedLogs = logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return sortedLogs.map(log => this.normalizeEntry(log, websiteId))
  }

  /**
   * Normalize a single log entry
   */
  private normalizeEntry(log: NormalizedLog, websiteId: string): DetectionLogEntry {
    // Generate unique fingerprint
    const fingerprint = this.generateFingerprint(log, websiteId)

    // Generate or retrieve session ID
    const sessionId = this.generateSessionId(log)

    // Convert to DetectionLogEntry format
    const detectionEntry: DetectionLogEntry = {
      // Core fields from NormalizedLog
      timestamp: log.timestamp,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      bot_name: log.bot_name,
      is_bot: log.is_bot,
      bot_category: log.bot_category,
      bytes_transferred: log.bytes_transferred || 0,
      response_time_ms: log.response_time_ms,
      status_code: log.status_code,
      path: log.path,
      method: log.method,

      // Detection engine extensions
      fingerprint,
      sessionId,

      // Additional fields that might be available
      referer: this.extractReferer(log),
      host: this.extractHost(log),
      protocol: this.extractProtocol(log),
      country: this.extractCountry(log),
      tlsVersion: this.extractTLSVersion(log),
      requestBytes: this.extractRequestBytes(log)
    }

    return detectionEntry
  }

  /**
   * Generate unique fingerprint for log entry
   */
  private generateFingerprint(log: NormalizedLog, websiteId: string): string {
    // Round timestamp to second to reduce granularity
    const roundedTimestamp = Math.floor(log.timestamp.getTime() / 1000) * 1000
    const isoSecond = new Date(roundedTimestamp).toISOString()

    // Combine identifying fields
    const parts = [
      websiteId,
      isoSecond,
      log.method || 'GET',
      log.path || '/',
      String(log.status_code || 200),
      String(log.bytes_transferred || 0),
      (log.user_agent || '').slice(0, 200), // Truncate to avoid excessive length
      log.ip_address || 'unknown'
    ]

    const raw = parts.join('|')
    return createHash('sha256').update(raw).digest('hex')
  }

  /**
   * Generate session ID based on IP, User Agent, and time proximity
   */
  private generateSessionId(log: NormalizedLog): string {
    const ip = log.ip_address || 'unknown'
    const userAgent = log.user_agent || 'unknown'
    const timestamp = log.timestamp.getTime()

    // Create base session key
    const baseKey = `${ip}|${this.hashUserAgent(userAgent)}`

    // Check if this request belongs to an existing session
    const existingSessionId = this.findExistingSession(baseKey, timestamp)
    if (existingSessionId) {
      return existingSessionId
    }

    // Create new session
    return this.createNewSession(baseKey, timestamp)
  }

  /**
   * Hash user agent to create consistent but shorter identifier
   */
  private hashUserAgent(userAgent: string): string {
    return createHash('md5').update(userAgent).digest('hex').slice(0, 8)
  }

  /**
   * Find existing session within time window
   */
  private findExistingSession(baseKey: string, timestamp: number): string | null {
    const sessionWindow = 30 * 60 * 1000 // 30 minutes in milliseconds

    // Look for recent sessions with same base key
    const sessionIds = Array.from(this.sessionCache.keys())
    for (const sessionId of sessionIds) {
      const cachedKey = this.sessionCache.get(sessionId)
      if (!cachedKey || !cachedKey.startsWith(baseKey)) continue

      // Extract timestamp from session ID
      const parts = sessionId.split('_')
      if (parts.length < 3) continue

      const sessionStart = parseInt(parts[2])
      if (timestamp - sessionStart <= sessionWindow) {
        return sessionId
      }
    }

    return null
  }

  /**
   * Create new session ID
   */
  private createNewSession(baseKey: string, timestamp: number): string {
    // Get session counter for this base key
    const counter = this.sessionCounter.get(baseKey) || 0
    this.sessionCounter.set(baseKey, counter + 1)

    // Create session ID: basekey_counter_timestamp
    const sessionId = `${baseKey.replace('|', '_')}_${counter + 1}_${timestamp}`

    // Cache the session
    this.sessionCache.set(sessionId, baseKey)

    return sessionId
  }

  /**
   * Extract referer information from log (implementation depends on log format)
   */
  private extractReferer(log: NormalizedLog): string | undefined {
    // In a full implementation, this would extract from actual log fields
    // For now, return undefined as base NormalizedLog doesn't include referer
    return undefined
  }

  /**
   * Extract host information
   */
  private extractHost(log: NormalizedLog): string | undefined {
    // Could extract from path if it includes host, or from additional fields
    return undefined
  }

  /**
   * Extract protocol information
   */
  private extractProtocol(log: NormalizedLog): string | undefined {
    // Default to HTTP/1.1 for web requests
    return log.method ? 'HTTP/1.1' : undefined
  }

  /**
   * Extract country information (would typically come from IP geolocation)
   */
  private extractCountry(log: NormalizedLog): string | undefined {
    // In production, this would use IP geolocation service
    return undefined
  }

  /**
   * Extract TLS version
   */
  private extractTLSVersion(log: NormalizedLog): string | undefined {
    // Would extract from server logs if available
    return undefined
  }

  /**
   * Extract request bytes
   */
  private extractRequestBytes(log: NormalizedLog): number | undefined {
    // Would extract from extended log formats
    return undefined
  }

  /**
   * Batch normalize with chunking for large datasets
   */
  async normalizeBatch(
    logs: NormalizedLog[],
    websiteId: string,
    chunkSize: number = 1000
  ): Promise<DetectionLogEntry[]> {
    const results: DetectionLogEntry[] = []

    for (let i = 0; i < logs.length; i += chunkSize) {
      const chunk = logs.slice(i, i + chunkSize)
      const normalizedChunk = this.normalize(chunk, websiteId)
      results.push(...normalizedChunk)

      // Allow event loop to process other tasks
      if (i + chunkSize < logs.length) {
        await new Promise(resolve => setImmediate(resolve))
      }
    }

    return results
  }

  /**
   * Normalize logs from specific time range (24-48 hour window)
   */
  normalizeTimeWindow(
    logs: NormalizedLog[],
    websiteId: string,
    startTime: Date,
    endTime: Date
  ): DetectionLogEntry[] {
    // Filter logs to time window
    const filteredLogs = logs.filter(log => {
      const logTime = log.timestamp.getTime()
      return logTime >= startTime.getTime() && logTime <= endTime.getTime()
    })

    return this.normalize(filteredLogs, websiteId)
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalSessions: number
    sessionsPerKey: Record<string, number>
  } {
    const sessionsPerKey: Record<string, number> = {}

    const sessionIds = Array.from(this.sessionCache.keys())
    for (const sessionId of sessionIds) {
      const baseKey = this.sessionCache.get(sessionId)
      if (baseKey) {
        sessionsPerKey[baseKey] = (sessionsPerKey[baseKey] || 0) + 1
      }
    }

    return {
      totalSessions: this.sessionCache.size,
      sessionsPerKey
    }
  }

  /**
   * Clear session cache
   */
  clearCache(): void {
    this.sessionCache.clear()
    this.sessionCounter.clear()
  }
}

// Parser utilities for different log formats
export class LogParser {
  /**
   * Parse Apache/Nginx combined log format
   */
  static parseApacheLog(line: string): Partial<NormalizedLog> | null {
    // Extended pattern to capture more fields
    const pattern = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\d+) "([^"]*)" "([^"]*)"(?: "([^"]*)")?/
    const match = line.match(pattern)

    if (!match) return null

    return {
      ip_address: match[1],
      timestamp: this.parseApacheTime(match[2]),
      method: match[3],
      path: match[4],
      status_code: parseInt(match[6]),
      bytes_transferred: parseInt(match[7]),
      user_agent: match[9],
      is_bot: false // Will be determined by detection engine
    }
  }

  /**
   * Parse Apache timestamp format
   */
  private static parseApacheTime(timeStr: string): Date {
    // Convert Apache format: "10/Oct/2023:13:55:36 +0000"
    const match = timeStr.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/)
    if (!match) return new Date()

    const [, day, month, year, hour, minute, second, tz] = match
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    }

    const monthNum = months[month]
    if (!monthNum) return new Date()

    // Convert timezone offset
    const tzHours = tz.slice(1, 3)
    const tzMins = tz.slice(3, 5)
    const tzSign = tz[0]
    const tzOffset = `${tzSign}${tzHours}:${tzMins}`

    const isoString = `${year}-${monthNum}-${day}T${hour}:${minute}:${second}${tzOffset}`
    return new Date(isoString)
  }

  /**
   * Parse JSON log format
   */
  static parseJSONLog(line: string): Partial<NormalizedLog> | null {
    try {
      const log = JSON.parse(line)

      return {
        timestamp: new Date(log.timestamp || log.time || Date.now()),
        ip_address: log.ip || log.client_ip || log.remote_addr,
        user_agent: log.user_agent || log.userAgent || log.ua,
        method: log.method || log.verb,
        path: log.path || log.url || log.uri,
        status_code: parseInt(log.status || log.status_code || log.response_code),
        bytes_transferred: parseInt(log.bytes || log.size || log.response_size || 0),
        response_time_ms: parseFloat(log.response_time || log.duration || log.elapsed),
        is_bot: false
      }
    } catch {
      return null
    }
  }
}

// Export singleton instance
export const logNormalizer = new LogNormalizer()