// Validated categorical palette (dataviz skill reference instance) — fixed hue
// order, never cycled or reassigned per-render. Light-mode values only: this
// dashboard runs a single (light) surface, so no dark-mode branch is wired.
export const SERIES = {
  blue: '#2a78d6',
  orange: '#eb6834',
  aqua: '#1baf7a',
  yellow: '#eda100',
  magenta: '#e87ba4',
  green: '#008300',
  violet: '#4a3aa7',
  red: '#e34948',
} as const

export const SERIES_ORDER = [
  SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.yellow,
  SERIES.magenta, SERIES.green, SERIES.violet, SERIES.red,
]

// Sequential (single-hue, magnitude) ramp — blue, light to dark.
export const SEQUENTIAL_BLUE = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b']

// Fixed status meaning — never reused for a plain series.
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

export const CHROME = {
  surface: '#fcfcfb',
  page: '#f9f9f7',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  muted: '#898781',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
} as const
