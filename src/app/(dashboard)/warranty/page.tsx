import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { BarComparisonChart } from '@/components/charts/BarComparisonChart'
import { resolveFilters, formatSAR, formatNumber, monthLabel } from '@/lib/dashboard/filters'
import { SERIES } from '@/lib/chartPalette'
import { ShieldCheck, DollarSign, Receipt, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function WarrantyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let trendQuery = supabase.from('v_warranty_value_monthly').select('*').gte('period_month', filters.fromDate)
  let laborCodesQuery = supabase.from('v_warranty_top_labor_codes').select('*')
  let partsQuery = supabase.from('v_warranty_top_parts').select('*')
  let rejectionsQuery = supabase.from('v_warranty_rejections').select('*')
  if (filters.branchId) {
    trendQuery = trendQuery.eq('branch_id', filters.branchId)
    laborCodesQuery = laborCodesQuery.eq('branch_id', filters.branchId)
    partsQuery = partsQuery.eq('branch_id', filters.branchId)
    rejectionsQuery = rejectionsQuery.eq('branch_id', filters.branchId)
  }
  const [{ data: trendRows }, { data: laborCodeRows }, { data: partRows }, { data: rejectionRows }] = await Promise.all([
    trendQuery, laborCodesQuery, partsQuery, rejectionsQuery,
  ])
  const rows = trendRows ?? []

  const months = Array.from(new Set(rows.map((r) => r.period_month))).sort()
  const trend = months.map((m) => {
    const monthRows = rows.filter((r) => r.period_month === m)
    return {
      label: monthLabel(m),
      Claims: monthRows.reduce((a, r) => a + Number(r.claims_count ?? 0), 0),
      Value: round(monthRows.reduce((a, r) => a + Number(r.labor_amount ?? 0) + Number(r.parts_amount ?? 0) + Number(r.sublet_amount ?? 0), 0)),
    }
  })

  const totalClaims = rows.reduce((a, r) => a + Number(r.claims_count ?? 0), 0)
  const totalValue = rows.reduce((a, r) => a + Number(r.labor_amount ?? 0) + Number(r.parts_amount ?? 0) + Number(r.sublet_amount ?? 0), 0)
  const avgClaimValue = totalClaims > 0 ? totalValue / totalClaims : null
  const totalRejections = (rejectionRows ?? []).reduce((a, r) => a + Number(r.rejection_count ?? 0), 0)
  const avgClaimTrend = trend.map((r) => (r.Claims > 0 ? round(r.Value / r.Claims) : 0))

  const byLaborName = new Map<string, number>()
  for (const r of laborCodeRows ?? []) byLaborName.set(r.labor_name ?? r.labor_code ?? 'Unknown', (byLaborName.get(r.labor_name ?? r.labor_code) ?? 0) + Number(r.claim_line_count ?? 0))
  const topFailures = Array.from(byLaborName.entries()).map(([label, Count]) => ({ label, Count })).sort((a, b) => b.Count - a.Count).slice(0, 10)

  const byPartName = new Map<string, number>()
  for (const r of partRows ?? []) byPartName.set(r.part_name ?? r.part_no ?? 'Unknown', (byPartName.get(r.part_name ?? r.part_no) ?? 0) + Number(r.total_amount ?? 0))
  const topParts = Array.from(byPartName.entries()).map(([label, Amount]) => ({ label, Amount: round(Amount) })).sort((a, b) => b.Amount - a.Amount).slice(0, 10)

  return (
    <>
      <TopBar title="Warranty claims" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Claims received" value={formatNumber(totalClaims)} sublabel={`Last ${filters.monthsBack} months (by reception date)`}
            icon={ShieldCheck} trend={trend.map((r) => r.Claims)} trendColor={SERIES.blue} />
          <KpiCard label="Total claim value" value={formatSAR(totalValue, { compact: true })} sublabel="Labor + parts + sublet"
            icon={DollarSign} trend={trend.map((r) => r.Value)} trendColor={SERIES.orange} />
          <KpiCard label="Avg claim value" value={avgClaimValue !== null ? formatSAR(avgClaimValue) : '—'}
            icon={Receipt} trend={avgClaimTrend} trendColor={SERIES.aqua} />
          <KpiCard label="Sublet rejections" value={formatNumber(totalRejections)} sublabel="All time on file" icon={AlertTriangle} />
        </div>

        <ChartCard title="Claims volume & value trend">
          {trend.length ? (
            <TrendLineChart data={trend} series={[{ key: 'Value', label: 'Claim value (SAR)' }]} valueFormat="sarCompact" />
          ) : <EmptyState message="No warranty claim data yet. Upload the WTY Claims Batch Export." />}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Most common failure items" subtitle="By claim line count, all time on file">
            {topFailures.length ? (
              <BarComparisonChart data={topFailures} layout="horizontal" height={Math.max(220, topFailures.length * 32)}
                series={[{ key: 'Count', label: 'Claim lines' }]} />
            ) : <EmptyState message="No warranty labor data yet." />}
          </ChartCard>
          <ChartCard title="Highest-value claimed parts" subtitle="By total amount, all time on file">
            {topParts.length ? (
              <BarComparisonChart data={topParts} layout="horizontal" height={Math.max(220, topParts.length * 32)}
                series={[{ key: 'Amount', label: 'Amount' }]} valueFormat="sarCompact" />
            ) : <EmptyState message="No warranty parts data yet." />}
          </ChartCard>
        </div>
      </div>
    </>
  )
}

function round(v: number) { return Math.round(v * 100) / 100 }
