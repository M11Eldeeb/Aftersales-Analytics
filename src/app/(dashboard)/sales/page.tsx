import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { BarComparisonChart } from '@/components/charts/BarComparisonChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { resolveFilters, formatSAR, formatPct, monthLabel } from '@/lib/dashboard/filters'
import { SERIES } from '@/lib/chartPalette'
import { DollarSign, Package, Clock, Percent } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function SalesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let labor = supabase.from('v_labor_sales_monthly').select('*').gte('period_month', filters.fromDate)
  let parts = supabase.from('v_parts_sales_monthly').select('*').gte('period_month', filters.fromDate)
  if (filters.branchId) {
    labor = labor.eq('branch_id', filters.branchId)
    parts = parts.eq('branch_id', filters.branchId)
  }
  const [laborRes, partsRes] = await Promise.all([labor, parts])
  const laborRows = laborRes.data ?? []
  const partsRows = partsRes.data ?? []

  const months = Array.from(new Set([...laborRows.map((r) => r.period_month), ...partsRows.map((r) => r.period_month)])).sort()

  const trend = months.map((m) => ({
    label: monthLabel(m),
    Labor: round(laborRows.filter((r) => r.period_month === m).reduce((a, r) => a + Number(r.labor_sales ?? 0), 0)),
    Parts: round(partsRows.filter((r) => r.period_month === m).reduce((a, r) => a + Number(r.parts_sales ?? 0), 0)),
  }))

  const branchTotals = new Map<string, { name: string; labor: number; parts: number }>()
  const branchMap = new Map(branches.map((b) => [b.id, b.display_name]))
  for (const r of laborRows) {
    const key = r.branch_id ?? 'unknown'
    const e = branchTotals.get(key) ?? { name: branchMap.get(key) ?? 'Unassigned', labor: 0, parts: 0 }
    e.labor += Number(r.labor_sales ?? 0)
    branchTotals.set(key, e)
  }
  for (const r of partsRows) {
    const key = r.branch_id ?? 'unknown'
    const e = branchTotals.get(key) ?? { name: branchMap.get(key) ?? 'Unassigned', labor: 0, parts: 0 }
    e.parts += Number(r.parts_sales ?? 0)
    branchTotals.set(key, e)
  }
  const branchBars = Array.from(branchTotals.values())
    .sort((a, b) => (b.labor + b.parts) - (a.labor + a.parts))
    .slice(0, 12)
    .map((b) => ({ label: b.name, Labor: round(b.labor), Parts: round(b.parts) }))

  const channelTotals = new Map<string, number>()
  for (const r of laborRows) channelTotals.set(r.channel, (channelTotals.get(r.channel) ?? 0) + Number(r.labor_sales ?? 0))
  const channelDonut = Array.from(channelTotals.entries()).map(([name, value]) => ({ name, value: round(value) }))

  const totalLabor = laborRows.reduce((a, r) => a + Number(r.labor_sales ?? 0), 0)
  const totalParts = partsRows.reduce((a, r) => a + Number(r.parts_sales ?? 0), 0)
  const totalSoldHours = laborRows.reduce((a, r) => a + Number(r.sold_hours ?? 0), 0)
  const totalPartsProfit = partsRows.reduce((a, r) => a + Number(r.parts_profit ?? 0), 0)
  const partsGpPct = totalParts > 0 ? (totalPartsProfit / totalParts) * 100 : null

  const laborTrend = trend.map((r) => r.Labor)
  const partsTrend = trend.map((r) => r.Parts)
  const soldHoursTrend = months.map((m) => laborRows.filter((r) => r.period_month === m).reduce((a, r) => a + Number(r.sold_hours ?? 0), 0))
  const partsGpTrend = months.map((m) => {
    const s = partsRows.filter((r) => r.period_month === m)
    const sales = s.reduce((a, r) => a + Number(r.parts_sales ?? 0), 0)
    const profit = s.reduce((a, r) => a + Number(r.parts_profit ?? 0), 0)
    return sales > 0 ? (profit / sales) * 100 : 0
  })

  return (
    <>
      <TopBar title="Sales & financial" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Labor sales" value={formatSAR(totalLabor, { compact: true })} sublabel={`Last ${filters.monthsBack} months`}
            icon={DollarSign} trend={laborTrend} trendColor={SERIES.blue} />
          <KpiCard label="Parts sales" value={formatSAR(totalParts, { compact: true })} sublabel={`Last ${filters.monthsBack} months`}
            icon={Package} trend={partsTrend} trendColor={SERIES.orange} />
          <KpiCard label="Total sold hours" value={totalSoldHours.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            icon={Clock} trend={soldHoursTrend} trendColor={SERIES.aqua} />
          <KpiCard label="Parts gross profit %" value={formatPct(partsGpPct)} icon={Percent} trend={partsGpTrend} trendColor={SERIES.violet} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Labor vs parts sales trend">
            {trend.length ? (
              <TrendLineChart data={trend} series={[{ key: 'Labor', label: 'Labor' }, { key: 'Parts', label: 'Parts' }]}
                valueFormat="sarCompact" />
            ) : <EmptyState message="No sales data yet. Upload KH9 (labor) and MG5 (parts) exports." />}
          </ChartCard>
          <ChartCard title="Labor sales by channel">
            {channelDonut.length ? (
              <DonutChart data={channelDonut} valueFormat="sarCompact" />
            ) : <EmptyState message="No channel data yet." />}
          </ChartCard>
        </div>

        {!filters.branchId && (
          <ChartCard title="Sales by branch" subtitle={`Last ${filters.monthsBack} months, top 12`}>
            {branchBars.length ? (
              <BarComparisonChart data={branchBars} layout="horizontal" height={Math.max(260, branchBars.length * 32)}
                series={[{ key: 'Labor', label: 'Labor' }, { key: 'Parts', label: 'Parts' }]}
                valueFormat="sarCompact" />
            ) : <EmptyState message="No branch data yet." />}
          </ChartCard>
        )}
      </div>
    </>
  )
}

function round(v: number) { return Math.round(v * 100) / 100 }
