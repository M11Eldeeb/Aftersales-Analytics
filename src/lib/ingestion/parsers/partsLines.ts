import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, toISODate, rowsAsObjects, sheetToAOA } from '../xlsxUtil'
import { rowHash } from '../hash'
import type { ParsedBatch } from '../types'

export const PARTS_LINES_SIGNATURE = [
  'Invoice Number', 'WIP Number', 'Part Number', 'Order QTY', 'Sales Value', 'Cost Value', 'Profit Value',
]

export function detectPartsLinesSheet(ws: XLSX.WorkSheet): { headerRowIndex: number; score: number } {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, PARTS_LINES_SIGNATURE, 5, 0)
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, PARTS_LINES_SIGNATURE) }
}

export async function parsePartsLinesSheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, PARTS_LINES_SIGNATURE, 5, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  // No natural line-number column in this export: disambiguate genuine duplicate
  // lines (same invoice+part twice) with a stable per-file occurrence counter.
  const occurrence = new Map<string, number>()

  const rows = await Promise.all(
    objs.map(async (o) => {
      const invoiceNumber = n(o['Invoice Number'])
      const partNumber = s(o['Part Number'])
      const key = `${invoiceNumber ?? ''}|${partNumber ?? ''}`
      const occIndex = occurrence.get(key) ?? 0
      occurrence.set(key, occIndex + 1)

      const hash = await rowHash('parts_lines', [
        invoiceNumber, partNumber, o['WIP Number'], o['Order QTY'], o['Sales Value'], occIndex,
      ])
      return {
        row_hash: hash,
        company_code: s(o['COMPANY']),
        branch_name: s(o['COMPANY Name']),
        invoice_number: invoiceNumber,
        invoice_date: toISODate(o['Invoice  Date'] ?? o['Invoice Date']),
        date_decarded: toISODate(o['Date Decarded']),
        wip_number: n(o['WIP Number']),
        part_number: partNumber,
        description: s(o['Description']),
        account_name: s(o['Account Name']),
        account_code: s(o['Account Code']),
        order_qty: n(o['Order QTY']),
        retail_value: n(o['Retail Value']),
        discount_value: n(o['Discount Value']),
        discount_pct: n(o['Discount Per.']),
        sales_value: n(o['Sales Value']),
        cost_value: n(o['Cost Value']),
        profit_value: n(o['Profit Value']),
        fr_code: s(o['FR']),
        product_group: s(o['Product Group']),
        department_code: s(o['Department Code']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_parts_lines', label: 'Parts sales lines', rows }
}
