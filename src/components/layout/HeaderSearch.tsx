'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Match {
  wip_number: number
  make_model: string | null
  vin: string | null
  wip_status: string | null
  branches: { display_name: string } | null
}

export function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Match[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) {
      setResults(null)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('work_orders')
        .select('wip_number, make_model, vin, wip_status, branches(display_name)')
        .or(`vin.ilike.%${q}%,registration.ilike.%${q}%,wip_number.eq.${Number(q) || 0}`)
        .limit(6)
      if (error) console.error('HeaderSearch query error', error)
      setResults((data as unknown as Match[]) ?? [])
      setLoading(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-40 sm:w-64">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search WIP # or VIN…"
        className="w-full bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 pl-8 pr-8 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setResults(null) }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      )}

      {open && query.trim().length >= 3 && (
        <div className="absolute top-full mt-1.5 w-80 right-0 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
          {loading && <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>}
          {!loading && results?.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">No work orders match &ldquo;{query}&rdquo;.</div>
          )}
          {!loading && results?.map((r) => (
            <div key={r.wip_number} className="px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">WIP #{r.wip_number}</span>
                <span className="text-xs text-slate-400">{r.branches?.display_name ?? '—'}</span>
              </div>
              <div className="text-xs text-slate-500 truncate">{r.make_model ?? 'Unknown model'} · {r.vin ?? 'No VIN'}</div>
              <div className="text-xs text-slate-400">{r.wip_status ?? 'Status unknown'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
