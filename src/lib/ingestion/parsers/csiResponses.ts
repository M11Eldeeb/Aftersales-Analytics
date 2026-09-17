import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, toISODate, rowsAsObjects, sheetToAOA, extractBranchShortCode } from '../xlsxUtil'
import { rowHash } from '../hash'
import type { ParsedBatch } from '../types'

export const CSI_RESPONSES_SIGNATURE = [
  'Survey Description', 'Question Code', 'Score', 'VIN', 'Wip No.', 'Correct Question',
]

export function detectCsiResponsesSheet(ws: XLSX.WorkSheet): { headerRowIndex: number; score: number } {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, CSI_RESPONSES_SIGNATURE, 5, 0)
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, CSI_RESPONSES_SIGNATURE) }
}

export async function parseCsiResponsesSheet(
  ws: XLSX.WorkSheet,
  fileName: string,
  sheetName: string
): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, CSI_RESPONSES_SIGNATURE, 5, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs.map(async (o, idx) => {
      const operatorName = s(o['Owing operator']) ?? s(o['Invoicing operator']) ?? s(o['Operator'])
      const hash = await rowHash('csi_responses', [
        sheetName, o['Wip No.'], o['Question Code'], o['Respons Date'], o['Mobile'], idx,
      ])
      return {
        row_hash: hash,
        survey_description: s(o['Survey Description']),
        response_date: toISODate(o['Respons Date']),
        question_code: s(o['Question Code']),
        response_raw: s(o['Response']),
        score: n(o['Score']),
        customer_name: s(o['Customer Full Name']),
        mobile: s(o['Mobile']),
        vin: s(o['VIN']),
        document_date: toISODate(o['Docment Date']),
        last_service_doc: n(o['Last Service Doc.']),
        wip_number: n(o['Wip No.']),
        branch_alias: s(o['Branch Name']),
        branch_short_code: extractBranchShortCode(o['Branch Name']),
        operator_name: operatorName,
        notes: s(o['Notes']),
        survey_month: n(o['Month']),
        correct_question: s(o['Correct Question']),
        answer: s(o['Answer']),
        sentiment: s(o['Sentiment']),
        category_en: s(o['Category En']),
        category_ar: s(o['Category Ar']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_csi_responses', label: `CSI survey responses (${sheetName})`, rows }
}
