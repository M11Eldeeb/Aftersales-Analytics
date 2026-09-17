import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { KpiCard } from '@/components/ui/KpiCard'
import { ChartCard, EmptyState } from '@/components/ui/ChartCard'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { BarComparisonChart } from '@/components/charts/BarComparisonChart'
import { resolveFilters, formatNumber, formatPct, monthLabel } from '@/lib/dashboard/filters'
import { SERIES } from '@/lib/chartPalette'
import { Smile, Users2, ThumbsUp, MessageSquareWarning } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Search = Record<string, string | string[] | undefined>

export default async function CsiPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const filters = resolveFilters(sp)
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  const supabase = await createClient()

  let npsQuery = supabase.from('v_csi_nps_monthly').select('*').gte('period_month', filters.fromDate)
  let remarksQuery = supabase.from('v_csi_remarks_by_category').select('*').gte('period_month', filters.fromDate)
  if (filters.branchId) {
    npsQuery = npsQuery.eq('branch_id', filters.branchId)
    remarksQuery = remarksQuery.eq('branch_id', filters.branchId)
  }
  const [{ data: npsRows }, { data: remarkRows }] = await Promise.all([npsQuery, remarksQuery])
  const rows = npsRows ?? []

  const months = Array.from(new Set(rows.map((r) => r.period_month))).sort()
  const trend = months.map((m) => {
    const monthRows = rows.filter((r) => r.period_month === m)
    const promoters = monthRows.reduce((a, r) => a + Number(r.promoters ?? 0), 0)
    const detractors = monthRows.reduce((a, r) => a + Number(r.detractors ?? 0), 0)
    const responses = monthRows.reduce((a, r) => a + Number(r.nps_responses ?? 0), 0)
    const csiVals = monthRows.map((r) => Number(r.avg_csi_score ?? 0)).filter((v) => v > 0)
    return {
      label: monthLabel(m),
      NPS: responses > 0 ? round(((promoters - detractors) / responses) * 100) : null,
      CSI: csiVals.length ? round((csiVals.reduce((a, v) => a + v, 0) / csiVals.length) * 20) : null, // 1-5 scale -> %
    }
  })

  const totalResponses = rows.reduce((a, r) => a + Number(r.nps_responses ?? 0), 0)
  const totalPromoters = rows.reduce((a, r) => a + Number(r.promoters ?? 0), 0)
  const totalDetractors = rows.reduce((a, r) => a + Number(r.detractors ?? 0), 0)
  const overallNps = totalResponses > 0 ? ((totalPromoters - totalDetractors) / totalResponses) * 100 : null

  const negRows = (remarkRows ?? []).filter((r) => r.sentiment === 'Negative')
  const negByCategory = new Map<string, number>()
  for (const r of negRows) negByCategory.set(r.category_en, (negByCategory.get(r.category_en) ?? 0) + Number(r.remark_count ?? 0))
  const topNegative = Array.from(negByCategory.entries())
    .map(([label, Count]) => ({ label, Count }))
    .sort((a, b) => b.Count - a.Count)
    .slice(0, 10)

  const totalRemarks = (remarkRows ?? []).reduce((a, r) => a + Number(r.remark_count ?? 0), 0)
  const totalNegative = negRows.reduce((a, r) => a + Number(r.remark_count ?? 0), 0)
  const negativePct = totalRemarks > 0 ? (totalNegative / totalRemarks) * 100 : null

  const responsesTrend = months.map((m) => rows.filter((r) => r.period_month === m).reduce((a, r) => a + Number(r.nps_responses ?? 0), 0))
  const negativePctTrend = months.map((m) => {
    const monthRemarks = (remarkRows ?? []).filter((r) => r.period_month === m)
    const total = monthRemarks.reduce((a, r) => a + Number(r.remark_count ?? 0), 0)
    const negative = monthRemarks.filter((r) => r.sentiment === 'Negative').reduce((a, r) => a + Number(r.remark_count ?? 0), 0)
    return total > 0 ? (negative / total) * 100 : 0
  })

  return (
    <>
      <TopBar title="CSI & NPS" userName={viewer!.fullName} userRole={viewer!.role} branches={branches} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="NPS score" value={overallNps !== null ? formatNumber(overallNps, 1) : '—'} sublabel={`Last ${filters.monthsBack} months`}
            icon={Smile} trend={trend.map((r) => r.NPS ?? 0)} trendColor={SERIES.blue} />
          <KpiCard label="Survey responses" value={formatNumber(totalResponses)} icon={Users2} trend={responsesTrend} trendColor={SERIES.orange} />
          <KpiCard label="Promoters vs detractors" value={`${formatNumber(totalPromoters)} / ${formatNumber(totalDetractors)}`} icon={ThumbsUp} />
          <KpiCard label="Negative remark rate" value={formatPct(negativePct)} sublabel="Of tagged remarks"
            icon={MessageSquareWarning} trend={negativePctTrend} trendColor={SERIES.red} />
        </div>

        <ChartCard title="NPS & CSI trend">
          {trend.length ? (
            <TrendLineChart data={trend} series={[{ key: 'NPS', label: 'NPS' }, { key: 'CSI', label: 'CSI (as %)' }]}
              valueFormat="plain" />
          ) : <EmptyState message="No CSI survey data yet. Upload the Aftersales CSI report." />}
        </ChartCard>

        <ChartCard title="Top negative feedback categories">
          {topNegative.length ? (
            <BarComparisonChart data={topNegative} layout="horizontal" height={Math.max(220, topNegative.length * 32)}
              series={[{ key: 'Count', label: 'Mentions' }]} />
          ) : <EmptyState message="No categorized remarks yet." />}
        </ChartCard>
      </div>
    </>
  )
}

function round(v: number) { return Math.round(v * 100) / 100 }
