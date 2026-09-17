import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { resolveFilters, formatSAR, formatPct, formatNumber, monthLabel } from '@/lib/dashboard/filters'
import { SERIES } from '@/lib/chartPalette'
import { Package, Archive, TrendingUp, Percent } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function PartsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let trendQuery = supabase.from('v_parts_sales_monthly').select('*').gte('period_month', filters.fromDate)
  let topQuery = supabase.from('v_top_parts').select('*')
  if (filters.branchId) {
    trendQuery = trendQuery.eq('branch_id', filters.branchId)
    topQuery = topQuery.eq('branch_id', filters.branchId)
  }
  const [{ data: trendRows }, { data: topRows }] = await Promise.all([trendQuery, topQuery])
  const rows = trendRows ?? []

  const months = Array.from(new Set(rows.map((r) => r.period_month))).sort()
  const trend = months.map((m) => {
    const monthRows = rows.filter((r) => r.period_month === m)
    return {
      label: monthLabel(m),
      Sales: round(monthRows.reduce((a, r) => a + Number(r.parts_sales ?? 0), 0)),
      Profit: round(monthRows.reduce((a, r) => a + Number(r.parts_profit ?? 0), 0)),
    }
  })

  const totalSales = rows.reduce((a, r) => a + Number(r.parts_sales ?? 0), 0)
  const totalProfit = rows.reduce((a, r) => a + Number(r.parts_profit ?? 0), 0)
  const totalCost = rows.reduce((a, r) => a + Number(r.parts_cost ?? 0), 0)
  const gpPct = totalSales > 0 ? (totalProfit / totalSales) * 100 : null
  const costTrend = months.map((m) => rows.filter((r) => r.period_month === m).reduce((a, r) => a + Number(r.parts_cost ?? 0), 0))
  const gpTrend = months.map((m) => {
    const s = rows.filter((r) => r.period_month === m)
    const sales = s.reduce((a, r) => a + Number(r.parts_sales ?? 0), 0)
    const profit = s.reduce((a, r) => a + Number(r.parts_profit ?? 0), 0)
    return sales > 0 ? (profit / sales) * 100 : 0
  })

  const topParts = new Map<string, { name: string; sales: number; profit: number; qty: number }>()
  for (const r of topRows ?? []) {
    const key = r.part_number ?? 'unknown'
    const e = topParts.get(key) ?? { name: `${r.part_number} — ${r.description ?? ''}`, sales: 0, profit: 0, qty: 0 }
    e.sales += Number(r.total_sales ?? 0)
    e.profit += Number(r.total_profit ?? 0)
    e.qty += Number(r.total_qty ?? 0)
    topParts.set(key, e)
  }
  const topPartsList = Array.from(topParts.values()).sort((a, b) => b.sales - a.sales).slice(0, 15)

  return (
    <>
      <TopBar title="Parts profitability" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Parts sales" value={formatSAR(totalSales, { compact: true })} sublabel={`Last ${filters.monthsBack} months`}
            icon={Package} trend={trend.map((r) => r.Sales)} trendColor={SERIES.blue} />
          <KpiCard label="Parts cost" value={formatSAR(totalCost, { compact: true })} icon={Archive} trend={costTrend} trendColor={SERIES.orange} />
          <KpiCard label="Gross profit" value={formatSAR(totalProfit, { compact: true })} icon={TrendingUp} trend={trend.map((r) => r.Profit)} trendColor={SERIES.aqua} />
          <KpiCard label="Gross profit %" value={formatPct(gpPct)} icon={Percent} trend={gpTrend} trendColor={SERIES.violet} />
        </div>

        <ChartCard title="Parts sales & profit trend">
          {trend.length ? (
            <TrendLineChart data={trend} series={[{ key: 'Sales', label: 'Sales' }, { key: 'Profit', label: 'Profit' }]}
              valueFormat="sarCompact" />
          ) : <EmptyState message="No parts data yet. Upload the MG5 parts export." />}
        </ChartCard>

        <ChartCard title="Top selling parts" subtitle="By total sales value, all time on file">
          {topPartsList.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-medium">Part</th>
                    <th className="py-2 font-medium text-right">Qty</th>
                    <th className="py-2 font-medium text-right">Sales</th>
                    <th className="py-2 font-medium text-right">Profit</th>
                    <th className="py-2 font-medium text-right">GP%</th>
                  </tr>
                </thead>
                <tbody>
                  {topPartsList.map((p) => (
                    <tr key={p.name} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-700 max-w-xs truncate" title={p.name}>{p.name}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(p.qty)}</td>
                      <td className="py-2 text-right tabular-nums">{formatSAR(p.sales)}</td>
                      <td className="py-2 text-right tabular-nums">{formatSAR(p.profit)}</td>
                      <td className="py-2 text-right tabular-nums">{p.sales > 0 ? formatPct((p.profit / p.sales) * 100) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState message="No parts data yet." />}
        </ChartCard>
      </div>
    </>
  )
}

function round(v: number) { return Math.round(v * 100) / 100 }
