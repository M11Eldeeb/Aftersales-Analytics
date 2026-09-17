import { STATUS } from '@/lib/chartPalette'
import { ArrowUp, ArrowDown, Minus, type LucideIcon } from 'lucide-react'

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const clean = data.filter((v) => Number.isFinite(v))
  if (clean.length < 2) return null
  const w = 100
  const h = 28
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const range = max - min || 1
  const points = clean
    .map((v, i) => `${(i / (clean.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KpiCard({
  label, value, sublabel, deltaPct, target, icon: Icon, trend, trendColor = '#2a78d6',
}: {
  label: string
  value: string
  sublabel?: string
  /** Positive = above target/prior period (good), negative = below (attention). */
  deltaPct?: number | null
  target?: string
  icon?: LucideIcon
  /** Chronological series (oldest → newest) rendered as a small trend sparkline. */
  trend?: number[]
  trendColor?: string
}) {
  const hasDelta = deltaPct !== null && deltaPct !== undefined && !Number.isNaN(deltaPct)
  const isGood = hasDelta && (deltaPct as number) >= 0
  const DeltaIcon = !hasDelta ? Minus : isGood ? ArrowUp : ArrowDown
  const deltaColor = !hasDelta ? CHROME_MUTED : isGood ? STATUS.good : STATUS.critical

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className="p-1.5 rounded-lg bg-slate-50 text-slate-500">
            <Icon size={14} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="font-headline text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="flex items-center justify-between text-xs">
        {sublabel && <span className="text-slate-400">{sublabel}</span>}
        {hasDelta && (
          <span className="flex items-center gap-0.5 font-semibold" style={{ color: deltaColor }}>
            <DeltaIcon size={12} strokeWidth={2.5} />
            {Math.abs(deltaPct as number).toFixed(1)}%
          </span>
        )}
      </div>
      {trend && trend.length >= 2 && (
        <div className="pt-1">
          <Sparkline data={trend} color={trendColor} />
        </div>
      )}
      {target && <div className="text-[11px] text-slate-400">Target: {target}</div>}
    </div>
  )
}

const CHROME_MUTED = '#898781'
