export interface ParsedBatch {
  /** Name of the Postgres RPC function to call, e.g. 'admin_upsert_work_orders'. */
  rpc: string
  /** Human label for progress UI, e.g. 'Work orders (FF3)'. */
  label: string
  rows: Record<string, unknown>[]
}

export interface DetectedSheet {
  sheetName: string
  docType: string
}
