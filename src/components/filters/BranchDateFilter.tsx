'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Building2, Calendar, ChevronDown } from 'lucide-react'

const RANGES = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
  { value: '24', label: 'Last 24 months' },
]

export function BranchDateFilter({ branches }: { branches: { id: string; display_name: string }[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const branch = searchParams.get('branch') ?? 'all'
  const range = searchParams.get('range') ?? '6'

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') params.delete(key)
    else params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <Building2 size={15} className="absolute left-2.5 text-slate-400 pointer-events-none" />
        <select
          value={branch}
          onChange={(e) => update('branch', e.target.value)}
          className="appearance-none rounded-lg bg-slate-50 pl-8 pr-7 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.display_name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
      </div>
      <div className="relative flex items-center">
        <Calendar size={15} className="absolute left-2.5 text-slate-400 pointer-events-none" />
        <select
          value={range}
          onChange={(e) => update('range', e.target.value)}
          className="appearance-none rounded-lg bg-slate-50 pl-8 pr-7 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}
