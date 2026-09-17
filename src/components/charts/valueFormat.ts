// Chart components are Client Components; page.tsx files that feed them data are
// Server Components. A formatter *function* can't cross that boundary as a prop
// (React Server Components only serialize data, not closures), so charts take a
// format *name* instead and resolve it to a function locally.
export type ValueFormat = 'sarCompact' | 'sar' | 'number0' | 'number1' | 'percent' | 'plain'

export function resolveValueFormatter(format?: ValueFormat): ((v: number) => string) | undefined {
  if (!format) return undefined
  switch (format) {
    case 'sarCompact':
      return (v) => {
        if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M SAR`
        if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K SAR`
        return `${Math.round(v).toLocaleString()} SAR`
      }
    case 'sar':
      return (v) => `${Math.round(v).toLocaleString()} SAR`
    case 'number0':
      return (v) => Math.round(v).toLocaleString()
    case 'number1':
      return (v) => v.toFixed(1)
    case 'percent':
      return (v) => `${v}%`
    case 'plain':
      return (v) => `${v}`
  }
}
