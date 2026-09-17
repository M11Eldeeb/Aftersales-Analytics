import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { DonutChart } from '@/components/charts/DonutChart'
import { BarComparisonChart } from '@/components/charts/BarComparisonChart'
import { resolveFilters, formatSAR, formatNumber, formatPct } from '@/lib/dashboard/filters'
import { ClipboardList, DollarSign, Timer, Repeat } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function OperationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let summaryQuery = supabase.from('v_wip_status_summary').select('*')
  let openOrdersQuery = supabase
    .from('work_orders')
    .select('wip_status, wip_parts_value, wip_labour_value, received_date')
    .not('wip_status', 'ilike', '%complete%')
    .not('wip_status', 'ilike', '%invoiced%')
  if (filters.branchId) {
    summaryQuery = summaryQuery.eq('branch_id', filters.branchId)
    openOrdersQuery = openOrdersQuery.eq('branch_id', filters.branchId)
  }
  const [{ data: summaryRows }, { data: openRows }] = await Promise.all([summaryQuery, openOrdersQuery])
  const rows = summaryRows ?? []

  const totalWip = rows.reduce((a, r) => a + Number(r.wip_count ?? 0), 0)
  const repeatRepairCount = rows.reduce((a, r) => a + Number(r.repeat_repair_count ?? 0), 0)

  const byStatus = new Map<string, number>()
  for (const r of rows) byStatus.set(r.wip_status ?? 'Unknown', (byStatus.get(r.wip_status ?? 'Unknown') ?? 0) + Number(r.wip_count ?? 0))
  const statusDonut = Array.from(byStatus.entries()).map(([name, value]) => ({ name, value }))

  const byPartsStatus = new Map<string, number>()
  for (const r of rows) byPartsStatus.set(r.parts_status ?? 'Unknown', (byPartsStatus.get(r.parts_status ?? 'Unknown') ?? 0) + Number(r.wip_count ?? 0))
  const partsStatusBars = Array.from(byPartsStatus.entries()).map(([label, Count]) => ({ label, Count })).sort((a, b) => b.Count - a.Count)

  const openWipValue = (openRows ?? []).reduce((a, r) => a + Number(r.wip_parts_value ?? 0) + Number(r.wip_labour_value ?? 0), 0)
  const now = Date.now()
  const ages = (openRows ?? [])
    .filter((r) => r.received_date)
    .map((r) => (now - new Date(r.received_date as string).getTime()) / 86400000)
  const avgAge = ages.length ? ages.reduce((a, v) => a + v, 0) / ages.length : null
  const agingBuckets = [
    { label: '0-3 days', min: 0, max: 3 },
    { label: '4-7 days', min: 4, max: 7 },
    { label: '8-14 days', min: 8, max: 14 },
    { label: '15-30 days', min: 15, max: 30 },
    { label: '30+ days', min: 31, max: Infinity },
  ].map((b) => ({ label: b.label, Count: ages.filter((a) => a >= b.min && a <= b.max).length }))

  return (
    <>
      <TopBar title="WIP & operations" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Open work orders" value={formatNumber((openRows ?? []).length)} sublabel="Current WIP register" icon={ClipboardList} />
          <KpiCard label="Open WIP value" value={formatSAR(openWipValue, { compact: true })} sublabel="Parts + labor outstanding" icon={DollarSign} />
          <KpiCard label="Avg age (open orders)" value={avgAge !== null ? `${formatNumber(avgAge, 0)} days` : '—'} icon={Timer} />
          <KpiCard label="Repeat repair rate" value={totalWip > 0 ? formatPct((repeatRepairCount / totalWip) * 100) : '—'} sublabel="Of all WIP on file" icon={Repeat} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="WIP by status">
            {statusDonut.length ? <DonutChart data={statusDonut} /> : <EmptyState message="No WIP data yet. Upload the FF3 export." />}
          </ChartCard>
          <ChartCard title="Open order aging">
            {ages.length ? (
              <BarComparisonChart data={agingBuckets} series={[{ key: 'Count', label: 'Orders' }]} />
            ) : <EmptyState message="No open orders in range." />}
          </ChartCard>
        </div>

        <ChartCard title="WIP by parts status">
          {partsStatusBars.length ? (
            <BarComparisonChart data={partsStatusBars} layout="horizontal" height={Math.max(220, partsStatusBars.length * 32)}
              series={[{ key: 'Count', label: 'Work orders' }]} />
          ) : <EmptyState message="No parts status data yet." />}
        </ChartCard>
      </div>
    </>
  )
}
