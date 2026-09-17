import type * as XLSX from 'xlsx'
import { n, s, toISODate, sheetToAOA, AOA, extractBranchShortCode } from '../xlsxUtil'
import type { ParsedBatch } from '../types'

// These three MSI-workbook tabs are hand-built pivot exports (merged-cell style, months
// running across columns) rather than flat detail tables, so they're matched by exact
// sheet name from the dispatcher instead of a header-content signature. They carry
// management *targets*, which can't be derived from the raw transactional tables, so
// they're worth the bespoke parsing even though the shape is fragile to layout changes.

function monthStartFromHeaderCell(v: unknown): string | null {
  const iso = toISODate(v)
  if (!iso) return null
  return iso.slice(0, 7) + '-01'
}

/** "Targets" tab: company-wide monthly budget by metric group + channel. */
export function parseMsiTargetsSheet(ws: XLSX.WorkSheet, fileName: string): ParsedBatch {
  const aoa = sheetToAOA(ws)
  const monthHeaderRow = aoa[1] as unknown[]
  const monthCols: { col: number; period: string }[] = []
  for (let c = 4; c <= 15; c++) {
    const period = monthStartFromHeaderCell(monthHeaderRow[c])
    if (period) monthCols.push({ col: c, period })
  }

  const rows: Record<string, unknown>[] = []
  let currentGroup: string | null = null
  for (let r = 2; r < aoa.length; r++) {
    const row = aoa[r] as unknown[]
    const groupCell = s(row[2])
    if (groupCell) currentGroup = groupCell
    const channel = s(row[3])
    if (!channel || !currentGroup) continue
    for (const { col, period } of monthCols) {
      const val = n(row[col])
      if (val === null) continue
      rows.push({
        branch_alias: null,
        staff_name: null,
        period_month: period,
        metric: currentGroup,
        channel,
        target_value: val,
        source_file: fileName,
      })
    }
  }

  return { rpc: 'admin_upsert_monthly_targets', label: 'Company-wide monthly targets', rows }
}

/** "SA Targets" tab: per-branch, per-service-advisor monthly labor target. */
export function parseSaTargetsSheet(ws: XLSX.WorkSheet, fileName: string): ParsedBatch {
  const aoa = sheetToAOA(ws)
  const monthHeaderRow = aoa[1] as unknown[]
  const monthCols: { col: number; period: string }[] = []
  for (let c = 4; c <= 15; c++) {
    const period = monthStartFromHeaderCell(monthHeaderRow[c])
    if (period) monthCols.push({ col: c, period })
  }

  const rows: Record<string, unknown>[] = []
  for (let r = 2; r < aoa.length; r++) {
    const row = aoa[r] as unknown[]
    const branchAlias = s(row[2])
    const staffName = s(row[3])
    if (!branchAlias || !staffName) continue
    for (const { col, period } of monthCols) {
      const val = n(row[col])
      if (val === null) continue
      rows.push({
        branch_alias: branchAlias,
        branch_short_code: extractBranchShortCode(branchAlias),
        staff_name: staffName,
        period_month: period,
        metric: 'labor_sales',
        channel: null,
        target_value: val,
        source_file: fileName,
      })
    }
  }

  return { rpc: 'admin_upsert_monthly_targets', label: 'Service advisor monthly targets', rows }
}

/** "Working Days" tab: network working-day counts per calendar month, used for run-rate KPIs. */
export function parseWorkingDaysSheet(ws: XLSX.WorkSheet, fileName: string): ParsedBatch {
  const aoa = sheetToAOA(ws) as AOA
  const monthNamesRow = aoa[0] as unknown[]
  const networkDaysRow = aoa[1] as unknown[]
  const startDateRow = aoa[2] as unknown[]
  const endDateRow = aoa[3] as unknown[]

  const rows: Record<string, unknown>[] = []
  for (let c = 1; c < monthNamesRow.length; c++) {
    const label = s(monthNamesRow[c])
    if (!label || label === 'YTD' || label === 'MTD') continue
    const startDate = toISODate(startDateRow?.[c])
    if (!startDate) continue
    rows.push({
      period_month: startDate.slice(0, 7) + '-01',
      network_days: n(networkDaysRow?.[c]),
      start_date: startDate,
      end_date: toISODate(endDateRow?.[c]),
      source_file: fileName,
    })
  }

  return { rpc: 'admin_upsert_working_days', label: 'Working days calendar', rows }
}
