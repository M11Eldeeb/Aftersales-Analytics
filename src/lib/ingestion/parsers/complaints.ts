import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, toISOTimestamp, rowsAsObjects, sheetToAOA, extractBranchShortCode } from '../xlsxUtil'
import { rowHash } from '../hash'
import type { ParsedBatch } from '../types'

export const COMPLAINTS_SIGNATURE = [
  'Complaint Category', 'Complaint Subcategory', 'Request Status', 'Chassis #', 'Complaint Validity',
]

export function detectComplaintsSheet(ws: XLSX.WorkSheet): { headerRowIndex: number; score: number } {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, COMPLAINTS_SIGNATURE, 10, 0)
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, COMPLAINTS_SIGNATURE) }
}

export async function parseComplaintsSheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, COMPLAINTS_SIGNATURE, 10, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs.map(async (o) => {
      const complaintNumber = s(o['Complaint'])
      const hash = await rowHash('complaints', [
        complaintNumber, o['Chassis #'], o['Created Time'], o['Mobile Number'],
      ])
      return {
        row_hash: hash,
        source_name: s(o['Name']),
        complaint_month: n(o['Month']),
        complaint_day: n(o['Day']),
        created_time: toISOTimestamp(o['Created Time']),
        complaint_number: complaintNumber,
        request_status: s(o['Request Status']),
        resolved_time: toISOTimestamp(o['Resolved Time']),
        complaint_category: s(o['Complaint Category']),
        complaint_subcategory: s(o['Complaint Subcategory']),
        mobile: s(o['Mobile Number']),
        requester_name: s(o['Requester']),
        vin: s(o['Chassis #']),
        complaint_validity: s(o['Complaint Validity']),
        region: s(o['Region']),
        city: s(o['City']),
        service_advisor_name: s(o['Service Advisor']),
        branch_alias: s(o['Branches']),
        branch_short_code: extractBranchShortCode(o['Branches']),
        complaint_representative: s(o['Complaint Representative']),
        year: n(o['Year']),
        month_name: s(o['Month Name']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_complaints', label: 'Complaints log', rows }
}
