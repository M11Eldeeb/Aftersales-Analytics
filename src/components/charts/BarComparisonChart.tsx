'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHROME, SERIES_ORDER } from '@/lib/chartPalette'
import { resolveValueFormatter, type ValueFormat } from './valueFormat'

export interface BarSeries {
  key: string
  label: string
}

export function BarComparisonChart({
  data, series, xKey = 'label', height = 260, valueFormat, layout = 'vertical',
}: {
  data: Record<string, unknown>[]
  series: BarSeries[]
  xKey?: string
  height?: number
  valueFormat?: ValueFormat
  layout?: 'vertical' | 'horizontal'
}) {
  const valueFormatter = resolveValueFormatter(valueFormat)
  const isHorizontal = layout === 'horizontal'
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data} layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid stroke={CHROME.gridline} horizontal={!isHorizontal} vertical={isHorizontal} />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: CHROME.muted }} axisLine={false} tickLine={false}
              tickFormatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: CHROME.muted }} width={140}
              axisLine={{ stroke: CHROME.baseline }} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: CHROME.muted }} axisLine={{ stroke: CHROME.baseline }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: CHROME.muted }} axisLine={false} tickLine={false}
              tickFormatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined} width={valueFormatter ? 64 : 40} />
          </>
        )}
        <Tooltip
          formatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: CHROME.gridline }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={SERIES_ORDER[i % SERIES_ORDER.length]} radius={[3, 3, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
