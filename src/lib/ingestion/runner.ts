import type { SupabaseClient } from '@supabase/supabase-js'
import { readWorkbook } from './xlsxUtil'
import { detectAndParseWorkbook } from './detect'
import { parseMaintenanceScheduleHtml } from './parsers/maintenanceHtml'
import type { ParsedBatch } from './types'

const CHUNK_SIZE = 2000

export interface IngestionProgress {
  fileName: string
  batchLabel: string
  batchIndex: number
  batchCount: number
  rowsDone: number
  rowsTotal: number
  status: 'parsing' | 'uploading' | 'done' | 'error'
  message?: string
}

export interface IngestionSummary {
  fileName: string
  batches: { label: string; rows: number; upserted: number }[]
  unrecognizedSheets: string[]
  totalRows: number
  totalUpserted: number
}

export async function ingestFile(
  supabase: SupabaseClient,
  file: File,
  onProgress?: (p: IngestionProgress) => void
): Promise<IngestionSummary> {
  const isHtml = /\.html?$/i.test(file.name)
  onProgress?.({
    fileName: file.name, batchLabel: 'Reading file', batchIndex: 0, batchCount: 0,
    rowsDone: 0, rowsTotal: 0, status: 'parsing',
  })

  let batches: ParsedBatch[]
  let unrecognizedSheets: string[] = []

  if (isHtml) {
    const text = await file.text()
    batches = parseMaintenanceScheduleHtml(text, file.name)
  } else {
    const data = new Uint8Array(await file.arrayBuffer())
    const wb = readWorkbook(data, file.name)
    const result = await detectAndParseWorkbook(wb, file.name)
    batches = result.batches
    unrecognizedSheets = result.unrecognizedSheets
  }

  batches = batches.filter((b) => b.rows.length > 0)

  const summary: IngestionSummary = {
    fileName: file.name, batches: [], unrecognizedSheets, totalRows: 0, totalUpserted: 0,
  }

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const batchId = await startBatch(supabase, file.name, batch.label)
    let upserted = 0
    let inserted = 0

    for (let offset = 0; offset < batch.rows.length; offset += CHUNK_SIZE) {
      const chunk = batch.rows.slice(offset, offset + CHUNK_SIZE)
      onProgress?.({
        fileName: file.name, batchLabel: batch.label, batchIndex: bi + 1, batchCount: batches.length,
        rowsDone: offset, rowsTotal: batch.rows.length, status: 'uploading',
      })
      const { data, error } = await supabase.rpc(batch.rpc, { payload: chunk })
      if (error) {
        await finishBatch(supabase, batchId, 'failed', batch.rows.length, inserted, 0, batch.rows.length - inserted, error.message)
        onProgress?.({
          fileName: file.name, batchLabel: batch.label, batchIndex: bi + 1, batchCount: batches.length,
          rowsDone: offset, rowsTotal: batch.rows.length, status: 'error', message: error.message,
        })
        throw new Error(`${batch.label}: ${error.message}`)
      }
      inserted += typeof data === 'number' ? data : chunk.length
      upserted += typeof data === 'number' ? data : chunk.length
    }

    await finishBatch(supabase, batchId, 'success', batch.rows.length, inserted, 0, 0)
    summary.batches.push({ label: batch.label, rows: batch.rows.length, upserted })
    summary.totalRows += batch.rows.length
    summary.totalUpserted += upserted
  }

  // Warranty claim value is precomputed (see admin_refresh_warranty_claim_totals) so the
  // dashboard's monthly trend query stays fast instead of re-aggregating ~160K line rows
  // on every page load. Refresh it whenever a warranty sheet was just touched.
  if (batches.some((b) => b.rpc.startsWith('admin_upsert_warranty'))) {
    onProgress?.({
      fileName: file.name, batchLabel: 'Refreshing warranty totals', batchIndex: batches.length, batchCount: batches.length,
      rowsDone: summary.totalRows, rowsTotal: summary.totalRows, status: 'uploading',
    })
    await supabase.rpc('admin_refresh_warranty_claim_totals')
  }

  onProgress?.({
    fileName: file.name, batchLabel: 'Done', batchIndex: batches.length, batchCount: batches.length,
    rowsDone: summary.totalRows, rowsTotal: summary.totalRows, status: 'done',
  })

  return summary
}

async function startBatch(supabase: SupabaseClient, fileName: string, detectedType: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_start_import_batch', {
    p_file_name: fileName, p_detected_type: detectedType,
  })
  if (error) throw new Error(`Could not start import batch: ${error.message}`)
  return data as string
}

async function finishBatch(
  supabase: SupabaseClient, batchId: string, status: string,
  rowCount: number, inserted: number, updated: number, skipped: number, errorMessage?: string
) {
  await supabase.rpc('admin_finish_import_batch', {
    p_id: batchId, p_status: status, p_row_count: rowCount, p_inserted: inserted,
    p_updated: updated, p_skipped: skipped, p_error: errorMessage ?? null,
  })
}
