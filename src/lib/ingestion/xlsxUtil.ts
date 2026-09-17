import * as XLSX from 'xlsx'

export type AOA = unknown[][]

export function readWorkbook(data: Uint8Array, fileName: string): XLSX.WorkBook {
  const isCsv = /\.csv$/i.test(fileName)
  return XLSX.read(data, {
    type: 'array',
    cellDates: true,
    raw: true,
    codepage: isCsv ? 65001 : undefined,
  })
}

export function sheetToAOA(ws: XLSX.WorkSheet): AOA {
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false }) as AOA
}

function normalizeHeader(v: unknown): string {
  return String(v ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Scans the first `maxScan` rows for the one whose cells best match `requiredHeaders` (case-insensitive). */
export function findHeaderRowIndex(
  aoa: AOA,
  requiredHeaders: string[],
  maxScan = 15,
  minMatchRatio = 0.6
): number {
  const required = requiredHeaders.map(normalizeHeader)
  let bestIdx = -1
  let bestScore = 0
  for (let i = 0; i < Math.min(maxScan, aoa.length); i++) {
    const row = aoa[i].map(normalizeHeader)
    const rowSet = new Set(row)
    const matches = required.filter((h) => rowSet.has(h)).length
    const score = matches / required.length
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestScore >= minMatchRatio ? bestIdx : -1
}

/** Converts data rows below `headerRowIndex` into objects keyed by the (normalized-trimmed, original-cased) header text. */
export function rowsAsObjects(aoa: AOA, headerRowIndex: number): Record<string, unknown>[] {
  const headerRow = aoa[headerRowIndex].map((h) =>
    String(h ?? '')
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
  const out: Record<string, unknown>[] = []
  for (let i = headerRowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i]
    if (row.every((c) => c === null || c === undefined || c === '')) continue
    const obj: Record<string, unknown> = {}
    headerRow.forEach((h, idx) => {
      if (h) obj[h] = row[idx] ?? null
    })
    out.push(obj)
  }
  return out
}

/** Header-signature match ratio against a given header row, for auto-detecting sheet type. */
export function headerMatchRatio(aoa: AOA, rowIndex: number, requiredHeaders: string[]): number {
  if (rowIndex < 0 || rowIndex >= aoa.length) return 0
  const row = new Set(aoa[rowIndex].map(normalizeHeader))
  const required = requiredHeaders.map(normalizeHeader)
  const matches = required.filter((h) => row.has(h)).length
  return matches / required.length
}

// Different Autoline reports spell the same branch differently (e.g. "C7 MG Ryd- Saleh
// Squ" vs "C7 MG Ryiadh Saleh Square 2S" vs "C7 MG Ryd- Saleh Square 2S"), but all of
// them lead with the same short branch code token. Extracting it lets the multi-alias
// branch resolver match these to one branch instead of creating a duplicate per spelling.
export function extractBranchShortCode(name: unknown): string | null {
  const str = s(name)
  if (!str) return null
  // Warranty exports use a "JMM/L7 Abha ABH" style dealer name, code after the slash.
  const afterSlash = str.includes('/') ? str.split('/').pop()!.trim() : str
  const m = afterSlash.match(/^([A-Za-z0-9]{2,3})\b/)
  return m ? m[1].toUpperCase() : null
}

export function s(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const str = String(v).trim()
  return str === '' ? null : str
}

export function n(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const cleaned = String(v).replace(/,/g, '').trim()
  if (cleaned === '') return null
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
}

export function boolYN(v: unknown): boolean | null {
  const str = s(v)
  if (!str) return null
  const upper = str.toUpperCase()
  if (upper === 'Y' || upper === 'YES' || upper === 'TRUE') return true
  if (upper === 'N' || upper === 'NO' || upper === 'FALSE') return false
  return null
}

const DMY_RE = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/
const YMD_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})/

export function toISODate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    return v.toISOString().slice(0, 10)
  }
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(epoch.getTime() + v * 86400000)
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  const str = String(v).trim()
  const ymd = str.match(YMD_RE)
  if (ymd) {
    const [, y, m, d] = ymd
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const dmy = str.match(DMY_RE)
  if (dmy) {
    const [, d, m, yRaw] = dmy
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = new Date(str)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function toISOTimestamp(v: unknown): string | null {
  const date = toISODate(v)
  if (date) return date
  if (v === null || v === undefined || v === '') return null
  const parsed = new Date(String(v))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
