import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { resolveFilters, formatSAR, formatNumber, formatPct, monthLabel } from '@/lib/dashboard/filters'
import { SERIES } from '@/lib/chartPalette'
import { DollarSign, Package, Gauge, Percent, Smile, MessageSquareWarning, ShieldCheck, ClipboardList, Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function ExecutiveOverviewPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let labor = supabase.from('v_labor_sales_monthly').select('*').gte('period_month', filters.fromDate)
  let parts = supabase.from('v_parts_sales_monthly').select('*').gte('period_month', filters.fromDate)
  let nps = supabase.from('v_csi_nps_monthly').select('*').gte('period_month', filters.fromDate)
  let complaints = supabase.from('v_complaints_monthly').select('*').gte('period_month', filters.fromDate)
  let warranty = supabase.from('v_warranty_value_monthly').select('*').gte('period_month', filters.fromDate)
  let wip = supabase.from('v_wip_status_summary').select('*')

  if (filters.branchId) {
    labor = labor.eq('branch_id', filters.branchId)
    parts = parts.eq('branch_id', filters.branchId)
    nps = nps.eq('branch_id', filters.branchId)
    complaints = complaints.eq('branch_id', filters.branchId)
    warranty = warranty.eq('branch_id', filters.branchId)
    wip = wip.eq('branch_id', filters.branchId)
  }

  const [laborRes, partsRes, npsRes, complaintsRes, warrantyRes, wipRes] = await Promise.all([
    labor, parts, nps, complaints, warranty, wip,
  ])

  const laborByMonth = sumByMonth(laborRes.data ?? [], ['labor_sales', 'sold_hours'])
  const partsByMonth = sumByMonth(partsRes.data ?? [], ['parts_sales', 'parts_profit'])
  const npsByMonth = avgByMonth(npsRes.data ?? [], ['avg_nps_score', 'avg_csi_score'], ['promoters', 'detractors', 'nps_responses'])
  const complaintsByMonth = sumByMonth(complaintsRes.data ?? [], ['total_complaints', 'valid_complaints', 'closed_complaints'])
  const warrantyByMonth = sumByMonth(warrantyRes.data ?? [], ['labor_amount', 'parts_amount', 'sublet_amount', 'claims_count'])

  const months = Array.from(
    new Set([...laborByMonth.keys(), ...partsByMonth.keys()])
  ).sort()
  const last = months[months.length - 1]
  const prev = months[months.length - 2]

  const laborLast = laborByMonth.get(last)?.labor_sales ?? 0
  const laborPrev = laborByMonth.get(prev)?.labor_sales ?? 0
  const partsLast = partsByMonth.get(last)?.parts_sales ?? 0
  const partsPrev = partsByMonth.get(prev)?.parts_sales ?? 0
  const soldHoursLast = laborByMonth.get(last)?.sold_hours ?? 0
  const recoveryRate = soldHoursLast > 0 ? laborLast / soldHoursLast : null
  const partsToLabor = laborLast > 0 ? (partsLast / laborLast) * 100 : null

  const npsLast = npsByMonth.get(last)
  const npsScore = npsLast && npsLast.nps_responses > 0
    ? ((npsLast.promoters - npsLast.detractors) / npsLast.nps_responses) * 100
    : null

  const wipRows = wipRes.data ?? []
  const openWip = wipRows.filter((r) => !/complete|invoiced|cancel/i.test(r.wip_status ?? ''))
  const openWipCount = openWip.reduce((a, r) => a + r.wip_count, 0)
  const totalWipCount = wipRows.reduce((a, r) => a + r.wip_count, 0)

  const hasLabor = laborRes.data && laborRes.data.length > 0
  const hasNps = npsRes.data && npsRes.data.length > 0
  const hasComplaints = complaintsRes.data && complaintsRes.data.length > 0
  const hasWarranty = warrantyRes.data && warrantyRes.data.length > 0
  const hasWip = wipRows.length > 0
  const hasVoc = hasNps || hasComplaints || hasWarranty

  const warrantyLast = warrantyByMonth.get(last)
  const warrantyValueLast = warrantyLast
    ? (warrantyLast.labor_amount ?? 0) + (warrantyLast.parts_amount ?? 0) + (warrantyLast.sublet_amount ?? 0)
    : 0

  const complaintsLast = complaintsByMonth.get(last)

  const salesTrend = months.map((m) => ({
    label: monthLabel(m),
    Labor: round(laborByMonth.get(m)?.labor_sales ?? 0),
    Parts: round(partsByMonth.get(m)?.parts_sales ?? 0),
  }))

  const npsTrend = months.map((m) => {
    const n = npsByMonth.get(m)
    const score = n && n.nps_responses > 0 ? ((n.promoters - n.detractors) / n.nps_responses) * 100 : null
    return { label: monthLabel(m), NPS: score !== null ? round(score) : null }
  })

  const laborTrend = months.map((m) => laborByMonth.get(m)?.labor_sales ?? 0)
  const partsTrend = months.map((m) => partsByMonth.get(m)?.parts_sales ?? 0)
  const recoveryTrend = months.map((m) => {
    const l = laborByMonth.get(m)
    return l && l.sold_hours ? (l.labor_sales ?? 0) / l.sold_hours : 0
  })
  const partsToLaborTrend = months.map((m) => {
    const l = laborByMonth.get(m)
    const p = partsByMonth.get(m)
    return l && l.labor_sales ? ((p?.parts_sales ?? 0) / l.labor_sales) * 100 : 0
  })
  const npsSparkline = npsTrend.map((r) => r.NPS ?? 0)
  const complaintsTrend = months.map((m) => complaintsByMonth.get(m)?.total_complaints ?? 0)
  const warrantyValueTrend = months.map((m) => {
    const w = warrantyByMonth.get(m)
    return w ? (w.labor_amount ?? 0) + (w.parts_amount ?? 0) + (w.sublet_amount ?? 0) : 0
  })

  return (
    <>
      <TopBar title="Executive overview" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Sales &amp; recovery</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {hasLabor && (
              <KpiCard label="Labor sales (latest month)" value={formatSAR(laborLast, { compact: true })}
                deltaPct={pctChange(laborLast, laborPrev)} sublabel={last ? monthLabel(last) : undefined}
                icon={DollarSign} trend={laborTrend} trendColor={SERIES.blue} />
            )}
            <KpiCard label="Parts sales (latest month)" value={formatSAR(partsLast, { compact: true })}
              deltaPct={pctChange(partsLast, partsPrev)} sublabel={last ? monthLabel(last) : undefined}
              icon={Package} trend={partsTrend} trendColor={SERIES.orange} />
            {hasLabor && (
              <>
                <KpiCard label="Recovery rate" value={recoveryRate !== null ? `${formatNumber(recoveryRate, 0)} SAR/hr` : '—'}
                  sublabel="Labor sales ÷ sold hours" icon={Gauge} trend={recoveryTrend} trendColor={SERIES.aqua} />
                <KpiCard label="Parts-to-labor ratio" value={formatPct(partsToLabor)} sublabel="Healthy range ~90–110%"
                  icon={Percent} trend={partsToLaborTrend} trendColor={SERIES.violet} />
              </>
            )}
          </div>
        </section>

        {hasVoc && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Customer experience &amp; VOC</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {hasNps && (
                <KpiCard label="NPS score (latest month)" value={npsScore !== null ? formatNumber(npsScore, 1) : '—'}
                  sublabel={npsLast ? `${formatNumber(npsLast.nps_responses)} responses` : undefined}
                  icon={Smile} trend={npsSparkline} trendColor={SERIES.green} />
              )}
              {hasComplaints && (
                <KpiCard label="Complaints (latest month)" value={formatNumber(complaintsLast?.total_complaints ?? 0)}
                  sublabel={complaintsLast ? `${formatNumber(complaintsLast.valid_complaints)} valid` : undefined}
                  icon={MessageSquareWarning} trend={complaintsTrend} trendColor={SERIES.red} />
              )}
              {hasWarranty && (
                <KpiCard label="Warranty claim value (latest month)" value={formatSAR(warrantyValueLast, { compact: true })}
                  sublabel={warrantyLast ? `${formatNumber(warrantyLast.claims_count)} claims` : undefined}
                  icon={ShieldCheck} trend={warrantyValueTrend} trendColor={SERIES.magenta} />
              )}
            </div>
          </section>
        )}

        {hasWip && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Operations snapshot</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Open work orders" value={formatNumber(openWipCount)} sublabel="Current WIP register" icon={ClipboardList} />
              <KpiCard label="Total WIP on file" value={formatNumber(totalWipCount)} icon={Layers} />
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={hasLabor ? 'Labor vs parts sales trend' : 'Parts sales trend'} subtitle={`Last ${filters.monthsBack} months`}>
            {salesTrend.length ? (
              <TrendLineChart data={salesTrend} series={hasLabor ? [{ key: 'Labor', label: 'Labor sales' }, { key: 'Parts', label: 'Parts sales' }] : [{ key: 'Parts', label: 'Parts sales' }]}
                valueFormat="sarCompact" />
            ) : <EmptyState message="No sales data yet. Upload KH9 (labor) and MG5 (parts) exports to see this trend." />}
          </ChartCard>
          {hasNps && (
            <ChartCard title="NPS trend" subtitle={`Last ${filters.monthsBack} months`}>
              {npsTrend.some((r) => r.NPS !== null) ? (
                <TrendLineChart data={npsTrend} series={[{ key: 'NPS', label: 'NPS score' }]} valueFormat="number0" />
              ) : <EmptyState message="No CSI survey data yet. Upload the Aftersales CSI report to see this trend." />}
            </ChartCard>
          )}
        </div>
      </div>
    </>
  )
}

function round(v: number) { return Math.round(v * 100) / 100 }

function pctChange(current: number, prior: number): number | null {
  if (!prior) return null
  return ((current - prior) / prior) * 100
}

function sumByMonth(rows: Record<string, unknown>[], fields: string[]) {
  const map = new Map<string, Record<string, number>>()
  for (const row of rows) {
    const month = String(row.period_month)
    const entry = map.get(month) ?? Object.fromEntries(fields.map((f) => [f, 0]))
    for (const f of fields) entry[f] += Number(row[f] ?? 0)
    map.set(month, entry)
  }
  return map as Map<string, Record<string, number> & { labor_sales?: number; sold_hours?: number; parts_sales?: number; parts_profit?: number; total_complaints?: number; valid_complaints?: number; closed_complaints?: number; labor_amount?: number; parts_amount?: number; sublet_amount?: number; claims_count?: number }>
}

function avgByMonth(rows: Record<string, unknown>[], avgFields: string[], sumFields: string[]) {
  const map = new Map<string, Record<string, number>>()
  const counts = new Map<string, number>()
  for (const row of rows) {
    const month = String(row.period_month)
    const entry = map.get(month) ?? Object.fromEntries([...avgFields, ...sumFields].map((f) => [f, 0]))
    for (const f of sumFields) entry[f] += Number(row[f] ?? 0)
    for (const f of avgFields) entry[f] += Number(row[f] ?? 0)
    map.set(month, entry)
    counts.set(month, (counts.get(month) ?? 0) + 1)
  }
  for (const [month, entry] of map) {
    const c = counts.get(month) ?? 1
    for (const f of avgFields) entry[f] = entry[f] / c
  }
  return map as Map<string, { avg_nps_score: number; avg_csi_score: number; promoters: number; detractors: number; nps_responses: number }>
}
