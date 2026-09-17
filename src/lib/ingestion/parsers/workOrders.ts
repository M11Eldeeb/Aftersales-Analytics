import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, boolYN, toISODate, rowsAsObjects, sheetToAOA } from '../xlsxUtil'
import type { ParsedBatch } from '../types'

export const WORK_ORDERS_SIGNATURE = ['WIPNO', 'Job', 'WIP parts', 'WIP labour', 'Chassis', 'WIP STATUS']

export function detectWorkOrdersSheet(ws: XLSX.WorkSheet): { headerRowIndex: number; score: number } {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, WORK_ORDERS_SIGNATURE, 5, 0)
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, WORK_ORDERS_SIGNATURE) }
}

export function parseWorkOrdersSheet(ws: XLSX.WorkSheet, fileName: string): ParsedBatch {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, WORK_ORDERS_SIGNATURE, 5, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = objs
    .map((o) => {
      const wip = n(o['WIPNO'])
      if (wip === null) return null
      const notes = [o['Note-1'], o['Note-2'], o['Note-3'], o['Note-4']]
        .map((v) => s(v))
        .filter(Boolean)
        .join(' | ')
      return {
        wip_number: wip,
        branch_alias: s(o['Co']),
        job_number: n(o['Job']),
        vin: s(o['Chassis']),
        vehicle_model: s(o['Make/model']),
        registration: s(o['Regis']),
        make_model: s(o['Make/model']),
        direction: s(o['IN']),
        received_date: toISODate(o['RCVD DAT']),
        due_out_date: toISODate(o['Due out']),
        invoicable_amount: n(o['Invoicable']),
        wip_parts_value: n(o['WIP parts']),
        wip_labour_value: n(o['WIP labour']),
        account_number: s(o['A/C NUM']),
        invoice_number: n(o['Invoi']),
        status_code: s(o['S']),
        wip_status: s(o['WIP STATUS']),
        parts_status: s(o['Parts Status']),
        taken_hours: n(o['Taken HR']),
        advisor_name: s(o['Operator']),
        account_type: s(o['Description']),
        mileage: n(o['Mila']),
        brand: s(o['Brad']),
        repeat_repair: boolYN(o['Repeat Repair']),
        order_ref: s(o['Ord Rf']),
        approval_ref: s(o['Approve']),
        insurer: s(o['Insurer']),
        notes: notes || null,
        source_file: fileName,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  return { rpc: 'admin_upsert_work_orders', label: 'Work orders (WIP register)', rows }
}
