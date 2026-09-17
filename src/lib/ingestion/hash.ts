// Web Crypto API works in both the browser and Node 19+, so ingestion (which runs
// client-side to avoid serverless upload/time limits on huge exports) can share this.
export async function rowHash(tableTag: string, parts: unknown[]): Promise<string> {
  const normalized = parts.map((p) => (p === null || p === undefined ? '' : String(p))).join('')
  const data = new TextEncoder().encode(`${tableTag}${normalized}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
