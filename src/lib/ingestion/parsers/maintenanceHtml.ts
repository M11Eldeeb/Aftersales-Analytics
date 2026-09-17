import * as cheerio from 'cheerio'
import type { ParsedBatch } from '../types'

function kmLabelToInterval(label: string): number | null {
  const m = label.trim().match(/^(\d+)\s*K$/i)
  return m ? Number(m[1]) * 1000 : null
}

export function parseMaintenanceScheduleHtml(html: string, fileName: string): ParsedBatch[] {
  const $ = cheerio.load(html)
  const itemRows: Record<string, unknown>[] = []
  const pricingRows: Record<string, unknown>[] = []

  $('.model-card').each((_, card) => {
    const model = $(card).find('h2').first().text().trim()
    if (!model) return

    const kmCols: { colIndex: number; interval: number }[] = []
    $(card)
      .find('thead tr.km-row th')
      .each((i, th) => {
        if (i === 0) return
        const interval = kmLabelToInterval($(th).text())
        if (interval !== null) kmCols.push({ colIndex: i, interval })
      })

    $(card)
      .find('table > tr, table > tbody > tr')
      .each((_, tr) => {
        const cells = $(tr).find('td')
        if (cells.length === 0) return
        const label = $(cells[0]).text().trim()
        const isVatRow = $(tr).hasClass('vat-row') || /price/i.test(label)

        for (const { colIndex, interval } of kmCols) {
          const cell = cells[colIndex]
          if (!cell) continue
          if (isVatRow) {
            const raw = $(cell).text().replace(/,/g, '').trim()
            const price = raw === '' ? null : Number(raw)
            if (price !== null && Number.isFinite(price)) {
              pricingRows.push({ model, km_interval: interval, price_incl_vat: price })
            }
          } else {
            const marked = $(cell).hasClass('mark-R') || $(cell).text().trim() !== ''
            if (marked) {
              itemRows.push({ model, km_interval: interval, service_item: label, is_required: true })
            }
          }
        }
      })
  })

  return [
    { rpc: 'admin_upsert_maintenance_pricing', label: 'Maintenance schedule pricing', rows: pricingRows },
    { rpc: 'admin_upsert_maintenance_items', label: 'Maintenance schedule items', rows: itemRows },
  ]
}
