'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { SERIES_ORDER } from '@/lib/chartPalette'
import { resolveValueFormatter, type ValueFormat } from './valueFormat'

export function DonutChart({
  data, height = 240, valueFormat,
}: {
  data: { name: string; value: number }[]
  height?: number
  valueFormat?: ValueFormat
}) {
  const valueFormatter = resolveValueFormatter(valueFormat)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_ORDER[i % SERIES_ORDER.length]} stroke="#fcfcfb" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => (valueFormatter ? valueFormatter(Number(v)) : String(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
