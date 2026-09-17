import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, toISODate, rowsAsObjects, sheetToAOA, extractBranchShortCode } from '../xlsxUtil'
import { rowHash } from '../hash'
import type { ParsedBatch } from '../types'

export const WARRANTY_CLAIMS_SIGNATURE = ['VIN', 'Warranty Claim', 'Work Order No', 'Reception Date', 'Buy-off Company']
export const WARRANTY_LABOR_SIGNATURE = ['Warranty Claim', 'Item No.', 'Labor Code', 'Labor Name', 'Labor Time', 'labor Unit Price']
export const WARRANTY_PART_SIGNATURE = ['Warranty Claim', 'Item No.', 'Part No', 'Part Name', 'MarkUp Price', 'Amount']
export const WARRANTY_SUBLET_SIGNATURE = ['Warranty Claim', 'Item No.', 'Sublet Code', 'Sublet Name', 'Sublet Loss Ratio']

function detect(ws: XLSX.WorkSheet, signature: string[], maxScan = 3) {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, signature, maxScan, 0)
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, signature) }
}

export const detectWarrantyClaimsSheet = (ws: XLSX.WorkSheet) => detect(ws, WARRANTY_CLAIMS_SIGNATURE)
export const detectWarrantyLaborSheet = (ws: XLSX.WorkSheet) => detect(ws, WARRANTY_LABOR_SIGNATURE)
export const detectWarrantyPartSheet = (ws: XLSX.WorkSheet) => detect(ws, WARRANTY_PART_SIGNATURE)
export const detectWarrantySubletSheet = (ws: XLSX.WorkSheet) => detect(ws, WARRANTY_SUBLET_SIGNATURE)

export async function parseWarrantyClaimsSheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, WARRANTY_CLAIMS_SIGNATURE, 3, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = objs.map((o) => ({
    warranty_claim: s(o['Warranty Claim']),
    vin: s(o['VIN']),
    branch_alias: s(o['Dealer Name']) || null,
    branch_short_code: extractBranchShortCode(o['Dealer Name']),
    dealer_code: s(o['Dealer']),
    dealer_name: s(o['Dealer Name']),
    work_order_no: s(o['Work Order No']),
    wip_number: null,
    reception_date: toISODate(o['Reception Date']),
    repair_end_date: toISODate(o['Repair End Dat']),
    first_submit_date: toISODate(o['First Submit Date']),
    last_submit_date: toISODate(o['Last Submit Date']),
    last_submit_date_dealer: toISODate(o['Last Submit Date(Dealer)']),
    approved_by: s(o['Approved by Whom']),
    verification_date: toISODate(o['Verification Date']),
    buy_off_company: s(o['Buy-off Company']),
    approval_company: s(o['Approval Company']),
    brand: s(o['Brand']),
    prior_approval: s(o['Prior Approval']),
    country_region: s(o['Country/Region En']) ?? s(o['Country/Region']),
    customer_ref: s(o['Customer']),
    source_file: fileName,
  })).filter((r) => r.warranty_claim !== null)

  return { rpc: 'admin_upsert_warranty_claims', label: 'Warranty claims', rows }
}

export async function parseWarrantyLaborSheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, WARRANTY_LABOR_SIGNATURE, 3, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs.map(async (o) => {
      const hash = await rowHash('warranty_labor_lines', [o['Warranty Claim'], o['Item No.']])
      return {
        row_hash: hash,
        warranty_claim: s(o['Warranty Claim']),
        item_no: s(o['Item No.']),
        vin: s(o['VIN']),
        labor_type: s(o['Labor Type']),
        labor_code: s(o['Labor Code']),
        labor_name: s(o['Labor Name']),
        labor_time: n(o['Labor Time']),
        labor_loss_ratio: n(o['labor Loss Ratio']),
        labor_unit_price: n(o['labor Unit Price']),
        verification_date: toISODate(o['Verification Date']),
        settlement_date: toISODate(o['Settlement Date']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_warranty_labor_lines', label: 'Warranty labor lines', rows: rows.filter((r) => r.warranty_claim) }
}

export async function parseWarrantyPartSheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, WARRANTY_PART_SIGNATURE, 3, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs.map(async (o) => {
      const hash = await rowHash('warranty_part_lines', [o['Warranty Claim'], o['Item No.'], o['Part No']])
      return {
        row_hash: hash,
        warranty_claim: s(o['Warranty Claim']),
        item_no: s(o['Item No.']),
        vin: s(o['VIN']),
        part_no: s(o['Part No']),
        part_name: s(o['Part Name']),
        unit_price: n(o['Unit Price']),
        markup_price: n(o['MarkUp Price']),
        quantity: n(o['Quantity']),
        amount: n(o['Amount']),
        verification_date: toISODate(o['Verification Date']),
        settlement_date: toISODate(o['Settlement Date']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_warranty_part_lines', label: 'Warranty part lines', rows: rows.filter((r) => r.warranty_claim) }
}

export async function parseWarrantySubletSheet(ws: XLSX.WorkSheet, fileName: string): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, WARRANTY_SUBLET_SIGNATURE, 3, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs.map(async (o) => {
      const hash = await rowHash('warranty_sublet_lines', [o['Warranty Claim'], o['Item No.']])
      return {
        row_hash: hash,
        warranty_claim: s(o['Warranty Claim']),
        item_no: s(o['Item No.']),
        vin: s(o['VIN']),
        sublet_code: s(o['Sublet Code']),
        sublet_name: s(o['Sublet Name']),
        price: n(o['Price']),
        sublet_loss_ratio: n(o['Sublet Loss Ratio']),
        adjusted_amount: n(o['Adjusted Amount']),
        rejection_reason_code: s(o['Partial Rejection Reason Code']),
        verification_date: toISODate(o['Verification Date']),
        settlement_date: toISODate(o['Settlement Date']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_warranty_sublet_lines', label: 'Warranty sublet lines', rows: rows.filter((r) => r.warranty_claim) }
}
