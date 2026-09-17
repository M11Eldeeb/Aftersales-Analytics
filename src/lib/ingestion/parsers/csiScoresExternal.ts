import type * as XLSX from 'xlsx'
import { findHeaderRowIndex, headerMatchRatio, n, s, toISODate, rowsAsObjects, sheetToAOA } from '../xlsxUtil'
import { rowHash } from '../hash'
import type { ParsedBatch } from '../types'

// Deliberately small/exact: a lightweight external survey export (e.g. "KH2 - Survey
// Details Report") with just date/score/mobile/VIN, no question breakdown. Checked
// only after the richer CSI_RESPONSES signature fails, since it's a strict subset of it.
export const CSI_SCORES_EXTERNAL_SIGNATURE = ['Respons Date', 'Score', 'Mobile', 'VIN']

export function detectCsiScoresExternalSheet(ws: XLSX.WorkSheet): { headerRowIndex: number; score: number } {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, CSI_SCORES_EXTERNAL_SIGNATURE, 3, 0)
  if (headerRowIndex < 0) return { headerRowIndex, score: 0 }
  // Require a near-exact column count match so this doesn't also fire on richer sheets.
  const headerLen = (aoa[headerRowIndex] as unknown[]).filter((c) => c !== null && c !== '').length
  if (headerLen > CSI_SCORES_EXTERNAL_SIGNATURE.length + 1) return { headerRowIndex, score: 0 }
  return { headerRowIndex, score: headerMatchRatio(aoa, headerRowIndex, CSI_SCORES_EXTERNAL_SIGNATURE) }
}

export async function parseCsiScoresExternalSheet(
  ws: XLSX.WorkSheet,
  fileName: string,
  sheetName: string
): Promise<ParsedBatch> {
  const aoa = sheetToAOA(ws)
  const headerRowIndex = findHeaderRowIndex(aoa, CSI_SCORES_EXTERNAL_SIGNATURE, 3, 0)
  const objs = rowsAsObjects(aoa, headerRowIndex)

  const rows = await Promise.all(
    objs.map(async (o, idx) => {
      const hash = await rowHash('csi_scores_external', [sheetName, o['Mobile'], o['VIN'], o['Respons Date'], idx])
      return {
        row_hash: hash,
        source_label: sheetName,
        response_date: toISODate(o['Respons Date']),
        score: n(o['Score']),
        mobile: s(o['Mobile']),
        vin: s(o['VIN']),
        source_file: fileName,
      }
    })
  )

  return { rpc: 'admin_upsert_csi_scores_external', label: `External survey scores (${sheetName})`, rows }
}
