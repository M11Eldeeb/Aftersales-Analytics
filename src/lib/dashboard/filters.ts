export interface ResolvedFilters {
  branchId: string | null
  monthsBack: number
  fromDate: string // ISO date, first of month
}

export function resolveFilters(searchParams: Record<string, string | string[] | undefined>): ResolvedFilters {
  const branchParam = searchParams.branch
  const branchId = typeof branchParam === 'string' && branchParam !== 'all' ? branchParam : null

  const rangeParam = searchParams.range
  const monthsBack = typeof rangeParam === 'string' ? Number(rangeParam) || 6 : 6

  const d = new Date()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - (monthsBack - 1))
  const fromDate = d.toISOString().slice(0, 10)

  return { branchId, monthsBack, fromDate }
}

export function formatSAR(value: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  if (opts.compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M SAR`
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K SAR`
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value) + ' SAR'
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function monthLabel(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'No uploads yet'
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}
