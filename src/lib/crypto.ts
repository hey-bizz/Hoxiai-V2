// Placeholder crypto helpers. Replace with KMS or robust encryption in production.
export function encryptString(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64')
}
export function decryptString(s: string): string {
  return Buffer.from(s, 'base64').toString('utf8')
}

