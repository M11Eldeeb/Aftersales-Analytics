import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { resolveFilters, formatPct, formatNumber, monthLabel } from '@/lib/dashboard/filters'
import { SERIES } from '@/lib/chartPalette'
import { TrendingUp, Activity, Zap, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function TechniciansPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let query = supabase.from('v_technician_monthly').select('*').gte('period_month', filters.fromDate)
  if (filters.branchId) query = query.eq('branch_id', filters.branchId)
  const { data: rows } = await query
  const techRows = rows ?? []

  const staffIds = Array.from(new Set(techRows.map((r) => r.tech_staff_id).filter(Boolean)))
  const { data: staffRows } = staffIds.length
    ? await supabase.from('staff').select('id, full_name').in('id', staffIds)
    : { data: [] }
  const nameById = new Map((staffRows ?? []).map((s) => [s.id, s.full_name]))

  const months = Array.from(new Set(techRows.map((r) => r.period_month))).sort()
  const trend = months.map((m) => {
    const monthRows = techRows.filter((r) => r.period_month === m)
    const avg = (field: string) =>
      monthRows.length ? monthRows.reduce((a, r) => a + Number(r[field] ?? 0), 0) / monthRows.length : 0
    return {
      label: monthLabel(m),
      Efficiency: round(avg('avg_efficiency')),
      Utilisation: round(avg('avg_utilisation')),
      Productivity: round(avg('avg_productivity')),
    }
  })

  const last = months[months.length - 1]
  const lastRows = techRows.filter((r) => r.period_month === last)
  const avgOf = (field: string) =>
    lastRows.length ? lastRows.reduce((a, r) => a + Number(r[field] ?? 0), 0) / lastRows.length : null
  const totalSoldHoursLast = lastRows.reduce((a, r) => a + Number(r.sold_hours ?? 0), 0)
  const soldHoursTrend = months.map((m) => techRows.filter((r) => r.period_month === m).reduce((a, r) => a + Number(r.sold_hours ?? 0), 0))

  const byTech = new Map<string, { name: string; efficiency: number; utilisation: number; productivity: number; soldHours: number }>()
  for (const r of lastRows) {
    const key = r.tech_staff_id ?? 'unknown'
    byTech.set(key, {
      name: nameById.get(key) ?? 'Unknown',
      efficiency: Number(r.avg_efficiency ?? 0),
      utilisation: Number(r.avg_utilisation ?? 0),
      productivity: Number(r.avg_productivity ?? 0),
      soldHours: Number(r.sold_hours ?? 0),
    })
  }
  const leaderboard = Array.from(byTech.values()).sort((a, b) => b.efficiency - a.efficiency).slice(0, 15)

  return (
    <>
      <TopBar title="Technician productivity" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Avg efficiency" value={formatPct(avgOf('avg_efficiency'))} sublabel={last ? monthLabel(last) : undefined}
            icon={TrendingUp} trend={trend.map((r) => r.Efficiency)} trendColor={SERIES.blue} />
          <KpiCard label="Avg utilisation" value={formatPct(avgOf('avg_utilisation'))} sublabel={last ? monthLabel(last) : undefined}
            icon={Activity} trend={trend.map((r) => r.Utilisation)} trendColor={SERIES.orange} />
          <KpiCard label="Avg productivity" value={formatPct(avgOf('avg_productivity'))} sublabel={last ? monthLabel(last) : undefined}
            icon={Zap} trend={trend.map((r) => r.Productivity)} trendColor={SERIES.aqua} />
          <KpiCard label="Sold hours (latest month)" value={formatNumber(totalSoldHoursLast)}
            icon={Clock} trend={soldHoursTrend} trendColor={SERIES.violet} />
        </div>

        <ChartCard title="Efficiency, utilisation & productivity trend">
          {trend.length ? (
            <TrendLineChart data={trend}
              series={[{ key: 'Efficiency', label: 'Efficiency' }, { key: 'Utilisation', label: 'Utilisation' }, { key: 'Productivity', label: 'Productivity' }]}
              valueFormat="percent" />
          ) : <EmptyState message="No technician activity data yet. Upload the Daily Technician Report." />}
        </ChartCard>

        <ChartCard title="Technician leaderboard" subtitle={last ? `Ranked by efficiency — ${monthLabel(last)}` : undefined}>
          {leaderboard.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-2 font-medium">Technician</th>
                    <th className="py-2 font-medium text-right">Efficiency</th>
                    <th className="py-2 font-medium text-right">Utilisation</th>
                    <th className="py-2 font-medium text-right">Productivity</th>
                    <th className="py-2 font-medium text-right">Sold hours</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((t) => (
                    <tr key={t.name} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-700">{t.name}</td>
                      <td className="py-2 text-right tabular-nums">{formatPct(t.efficiency)}</td>
                      <td className="py-2 text-right tabular-nums">{formatPct(t.utilisation)}</td>
                      <td className="py-2 text-right tabular-nums">{formatPct(t.productivity)}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(t.soldHours, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState message="No technicians in range." />}
        </ChartCard>
      </div>
    </>
  )
}

function round(v: number) { return Math.round(v * 100) / 100 }
