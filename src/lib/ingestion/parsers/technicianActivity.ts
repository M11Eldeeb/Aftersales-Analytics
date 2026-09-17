import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, toISODate, rowsAsObjects, sheetToAOA, AOA, extractBranchShortCode } from '../xlsxUtil'
import { rowHash } from '../hash'
import type { ParsedBatch } from '../types'

export const TECH_ACTIVITY_SIGNATURE = ['Code', 'Name', 'Sold', 'Taken', 'Efficiency', 'Utilisation', 'Productivity']

export function detectTechActivitySheet(ws: XLSX.WorkSheet): { headerRowIndex: number; score: number } {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, TECH_ACTIVITY_SIGNATURE, 6, 0)
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, TECH_ACTIVITY_SIGNATURE) }
}

function extractReportDate(aoa: AOA): string | null {
  for (let i = 0; i < Math.min(4, aoa.length); i++) {
    const row = aoa[i]
    for (let j = 0; j < row.length; j++) {
      if (String(row[j] ?? '').trim().toLowerCase() === 'from:') {
        return toISODate(row[j + 1])
      }
    }
  }
  return null
}

function extractBranchName(aoa: AOA): string | null {
  const first = aoa[0]?.[0]
  return first ? String(first).trim() : null
}

export async function parseTechActivitySheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, TECH_ACTIVITY_SIGNATURE, 6, 0)
  const reportDate = extractReportDate(aoa)
  const fallbackBranch = extractBranchName(aoa)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs
      .filter((o) => s(o['Code']) !== null && s(o['Name']) !== null)
      .map(async (o) => {
        const techCode = s(o['Code'])
        const branchAlias = s(o['Branch Code']) ?? fallbackBranch
        const hash = await rowHash('technician_daily_activity', [reportDate, techCode, branchAlias])
        return {
          row_hash: hash,
          activity_date: reportDate,
          branch_alias: branchAlias,
          branch_short_code: extractBranchShortCode(s(o['Branch Code'])) ?? extractBranchShortCode(fallbackBranch),
          tech_code: techCode,
          tech_name: s(o['Name']),
          tech_type: s(o['Type']),
          team: s(o['Team']),
          skill: s(o['Skill']),
          sold_hours: n(o['Sold']),
          taken_hours: n(o['Taken']),
          efficiency_pct: n(o['Efficiency']),
          attended: n(o['Attended']),
          to_jobs: n(o['To Jobs']),
          to_idle: n(o['To Idle']),
          utilisation: n(o['Utilisation']),
          productivity: n(o['Productivity']),
          source_file: fileName,
        }
      })
  )

  return { rpc: 'admin_upsert_technician_activity', label: 'Technician daily activity', rows }
}
