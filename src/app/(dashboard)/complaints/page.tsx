import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { BarComparisonChart } from '@/components/charts/BarComparisonChart'
import { resolveFilters, formatNumber, formatPct, monthLabel } from '@/lib/dashboard/filters'
import { SERIES } from '@/lib/chartPalette'
import { MessageSquareWarning, CheckCircle2, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let trendQuery = supabase.from('v_complaints_monthly').select('*').gte('period_month', filters.fromDate)
  let categoryQuery = supabase.from('v_complaints_by_category').select('*')
  if (filters.branchId) {
    trendQuery = trendQuery.eq('branch_id', filters.branchId)
    categoryQuery = categoryQuery.eq('branch_id', filters.branchId)
  }
  const [{ data: trendRows }, { data: categoryRows }] = await Promise.all([trendQuery, categoryQuery])
  const rows = trendRows ?? []

  const months = Array.from(new Set(rows.map((r) => r.period_month))).sort()
  const trend = months.map((m) => {
    const monthRows = rows.filter((r) => r.period_month === m)
    return {
      label: monthLabel(m),
      Total: monthRows.reduce((a, r) => a + Number(r.total_complaints ?? 0), 0),
      Valid: monthRows.reduce((a, r) => a + Number(r.valid_complaints ?? 0), 0),
    }
  })

  const totalComplaints = rows.reduce((a, r) => a + Number(r.total_complaints ?? 0), 0)
  const validComplaints = rows.reduce((a, r) => a + Number(r.valid_complaints ?? 0), 0)
  const closedComplaints = rows.reduce((a, r) => a + Number(r.closed_complaints ?? 0), 0)
  const resolutionHours = rows.filter((r) => r.avg_resolution_hours).map((r) => Number(r.avg_resolution_hours))
  const avgResolutionHours = resolutionHours.length ? resolutionHours.reduce((a, v) => a + v, 0) / resolutionHours.length : null

  const closedRateTrend = months.map((m) => {
    const monthRows = rows.filter((r) => r.period_month === m)
    const total = monthRows.reduce((a, r) => a + Number(r.total_complaints ?? 0), 0)
    const closed = monthRows.reduce((a, r) => a + Number(r.closed_complaints ?? 0), 0)
    return total > 0 ? (closed / total) * 100 : 0
  })
  const resolutionTrend = months.map((m) => {
    const vals = rows.filter((r) => r.period_month === m && r.avg_resolution_hours).map((r) => Number(r.avg_resolution_hours))
    return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0
  })

  const byCategory = new Map<string, number>()
  for (const r of categoryRows ?? []) byCategory.set(r.complaint_category ?? 'Uncategorized', (byCategory.get(r.complaint_category ?? 'Uncategorized') ?? 0) + Number(r.complaint_count ?? 0))
  const categoryBars = Array.from(byCategory.entries())
    .map(([label, Count]) => ({ label, Count }))
    .sort((a, b) => b.Count - a.Count)
    .slice(0, 12)

  return (
    <>
      <TopBar title="Complaints (VOC)" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total complaints" value={formatNumber(totalComplaints)} sublabel={`Last ${filters.monthsBack} months`}
            icon={MessageSquareWarning} trend={trend.map((r) => r.Total)} trendColor={SERIES.red} />
          <KpiCard label="Valid complaint rate" value={totalComplaints > 0 ? formatPct((validComplaints / totalComplaints) * 100) : '—'}
            icon={CheckCircle2} trend={trend.map((r) => r.Valid)} trendColor={SERIES.orange} />
          <KpiCard label="Closed rate" value={totalComplaints > 0 ? formatPct((closedComplaints / totalComplaints) * 100) : '—'}
            icon={CheckCircle2} trend={closedRateTrend} trendColor={SERIES.aqua} />
          <KpiCard label="Avg resolution time" value={avgResolutionHours !== null ? `${formatNumber(avgResolutionHours, 0)} hrs` : '—'}
            icon={Clock} trend={resolutionTrend} trendColor={SERIES.violet} />
        </div>

        <ChartCard title="Complaints trend">
          {trend.length ? (
            <TrendLineChart data={trend} series={[{ key: 'Total', label: 'Total' }, { key: 'Valid', label: 'Valid' }]} />
          ) : <EmptyState message="No complaint data yet. Upload the Complaint Case Analysis report." />}
        </ChartCard>

        <ChartCard title="Complaints by category">
          {categoryBars.length ? (
            <BarComparisonChart data={categoryBars} layout="horizontal" height={Math.max(220, categoryBars.length * 32)}
              series={[{ key: 'Count', label: 'Complaints' }]} />
          ) : <EmptyState message="No categorized complaints yet." />}
        </ChartCard>
      </div>
    </>
  )
}
