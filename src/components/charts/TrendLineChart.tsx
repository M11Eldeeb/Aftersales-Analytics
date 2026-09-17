'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHROME, SERIES_ORDER } from '@/lib/chartPalette'
import { resolveValueFormatter, type ValueFormat } from './valueFormat'

export interface LineSeries {
  key: string
  label: string
}

export function TrendLineChart({
  data, series, xKey = 'label', height = 260, valueFormat,
}: {
  data: Record<string, unknown>[]
  series: LineSeries[]
  xKey?: string
  height?: number
  valueFormat?: ValueFormat
}) {
  const valueFormatter = resolveValueFormatter(valueFormat)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHROME.gridline} vertical={false} />
        <XAxis
          dataKey={xKey} tick={{ fontSize: 11, fill: CHROME.muted }}
          axisLine={{ stroke: CHROME.baseline }} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: CHROME.muted }} axisLine={false} tickLine={false}
          tickFormatter={valueFormatter ? (v) => valueFormatter(Number(v)) : undefined}
          width={valueFormatter ? 64 : 40}
        />
        <Tooltip
          formatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: CHROME.gridline }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line
            key={s.key} type="monotone" dataKey={s.key} name={s.label}
            stroke={SERIES_ORDER[i % SERIES_ORDER.length]} strokeWidth={2}
            dot={{ r: 3 }} activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
