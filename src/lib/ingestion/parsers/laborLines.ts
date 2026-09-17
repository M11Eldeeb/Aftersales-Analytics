import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, toISODate, rowsAsObjects, sheetToAOA } from '../xlsxUtil'
import { rowHash } from '../hash'
import type { ParsedBatch } from '../types'

export const LABOR_LINES_SIGNATURE = [
  'Job Number', 'WIP Number', 'Actual Line No(sort)', 'Allowed Time', 'Rate Per Hour', 'Retail VAL(Gross)',
]

export function detectLaborLinesSheet(ws: XLSX.WorkSheet): { headerRowIndex: number; score: number } {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, LABOR_LINES_SIGNATURE, 5, 0)
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, LABOR_LINES_SIGNATURE) }
}

export async function parseLaborLinesSheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, LABOR_LINES_SIGNATURE, 5, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs.map(async (o) => {
      const jobNumber = n(o['Job Number'])
      const lineNo = n(o['Actual Line No(sort)'])
      const hash = await rowHash('labor_lines', [
        jobNumber, lineNo, o['WIP Number'], o['Invoice Number'], o['Description'], o['Allowed Time'], o['Retail VAL(Gross)'],
      ])
      return {
        row_hash: hash,
        company_code: s(o['COMPANY']),
        branch_alias: s(o['Branch Code']),
        branch_name: s(o['COMPANY Name']),
        department_code: s(o['Department Code']),
        account_code: s(o['Account Code']),
        status_code: s(o['ST']),
        fr_code: s(o['FR']),
        job_number: jobNumber,
        claim_order_no: s(o['Claim Order No.']),
        invoice_number: n(o['Invoice Number']),
        wip_number: n(o['WIP Number']),
        line_no: lineNo,
        date_ins: toISODate(o['Date Ins']),
        invoiced_date: toISODate(o['Invoiced Date']),
        rts_code: s(o['RTS Code']),
        description: s(o['Description']),
        customer_account_name: s(o['Customer S Name']),
        allowed_time: n(o['Allowed Time']),
        rate_per_hour: n(o['Rate Per Hour']),
        retail_value: n(o['Retail VAL(Gross)']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_labor_lines', label: 'Labor sales lines', rows }
}
