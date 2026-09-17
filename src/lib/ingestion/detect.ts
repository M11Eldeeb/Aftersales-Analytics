import * as XLSX from 'xlsx'
import type { ParsedBatch } from './types'
import { detectWorkOrdersSheet, parseWorkOrdersSheet } from './parsers/workOrders'
import { detectLaborLinesSheet, parseLaborLinesSheet } from './parsers/laborLines'
import { detectPartsLinesSheet, parsePartsLinesSheet } from './parsers/partsLines'
import { detectCsiResponsesSheet, parseCsiResponsesSheet } from './parsers/csiResponses'
import { detectCsiScoresExternalSheet, parseCsiScoresExternalSheet } from './parsers/csiScoresExternal'
import { detectComplaintsSheet, parseComplaintsSheet } from './parsers/complaints'
import { detectTechActivitySheet, parseTechActivitySheet } from './parsers/technicianActivity'
import {
  detectWarrantyClaimsSheet, parseWarrantyClaimsSheet,
  detectWarrantyLaborSheet, parseWarrantyLaborSheet,
  detectWarrantyPartSheet, parseWarrantyPartSheet,
  detectWarrantySubletSheet, parseWarrantySubletSheet,
} from './parsers/warranty'
import { parseMsiTargetsSheet, parseSaTargetsSheet, parseWorkingDaysSheet } from './parsers/targets'

const SCORE_THRESHOLD = 0.8

// Tried in order of signature specificity/size so a narrower signature (e.g. the 4-column
// external survey export) never steals a sheet that actually matches a richer one.
const SHEET_DETECTORS: {
  key: string
  detect: (ws: XLSX.WorkSheet) => { headerRowIndex: number; score: number }
  parse: (ws: XLSX.WorkSheet, fileName: string, sheetName: string) => Promise<ParsedBatch> | ParsedBatch
}[] = [
  { key: 'warranty_claims', detect: detectWarrantyClaimsSheet, parse: (ws, f) => parseWarrantyClaimsSheet(ws, f) },
  { key: 'warranty_labor', detect: detectWarrantyLaborSheet, parse: (ws, f) => parseWarrantyLaborSheet(ws, f) },
  { key: 'warranty_part', detect: detectWarrantyPartSheet, parse: (ws, f) => parseWarrantyPartSheet(ws, f) },
  { key: 'warranty_sublet', detect: detectWarrantySubletSheet, parse: (ws, f) => parseWarrantySubletSheet(ws, f) },
  { key: 'work_orders', detect: detectWorkOrdersSheet, parse: (ws, f) => parseWorkOrdersSheet(ws, f) },
  { key: 'labor_lines', detect: detectLaborLinesSheet, parse: (ws, f) => parseLaborLinesSheet(ws, f) },
  { key: 'parts_lines', detect: detectPartsLinesSheet, parse: (ws, f) => parsePartsLinesSheet(ws, f) },
  { key: 'csi_responses', detect: detectCsiResponsesSheet, parse: (ws, f, sn) => parseCsiResponsesSheet(ws, f, sn) },
  { key: 'complaints', detect: detectComplaintsSheet, parse: (ws, f) => parseComplaintsSheet(ws, f) },
  { key: 'technician_activity', detect: detectTechActivitySheet, parse: (ws, f) => parseTechActivitySheet(ws, f) },
  { key: 'csi_scores_external', detect: detectCsiScoresExternalSheet, parse: (ws, f, sn) => parseCsiScoresExternalSheet(ws, f, sn) },
]

const MSI_SHEET_PARSERS: Record<string, (ws: XLSX.WorkSheet, fileName: string) => ParsedBatch> = {
  'Targets': parseMsiTargetsSheet,
  'SA Targets': parseSaTargetsSheet,
  'Working Days': parseWorkingDaysSheet,
}

export interface DetectResult {
  batches: ParsedBatch[]
  unrecognizedSheets: string[]
}

export async function detectAndParseWorkbook(wb: XLSX.WorkBook, fileName: string): Promise<DetectResult> {
  const batches: ParsedBatch[] = []
  const unrecognizedSheets: string[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]

    if (MSI_SHEET_PARSERS[sheetName]) {
      batches.push(MSI_SHEET_PARSERS[sheetName](ws, fileName))
      continue
    }

    let matched = false
    for (const d of SHEET_DETECTORS) {
      const { score } = d.detect(ws)
      if (score >= SCORE_THRESHOLD) {
        batches.push(await d.parse(ws, fileName, sheetName))
        matched = true
        break
      }
    }
    if (!matched) unrecognizedSheets.push(sheetName)
  }

  return { batches, unrecognizedSheets }
}
