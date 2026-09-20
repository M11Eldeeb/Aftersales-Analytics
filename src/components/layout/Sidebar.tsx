'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, DollarSign, Wrench, Smile, MessageSquareWarning,
  ShieldCheck, ClipboardList, UploadCloud, UserCog, Car, Loader2, Radar,
} from 'lucide-react'
import { relativeTime } from '@/lib/dashboard/filters'

// Rendered inside each Link so useLinkStatus() reports that specific link's pending
// state — swaps to a spinner the instant it's clicked, before the new route's data
// has loaded, so navigation always gives immediate visual feedback.
function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus()
  if (pending) return <Loader2 size={16} strokeWidth={2} className="animate-spin" />
  return <Icon size={16} strokeWidth={2} />
}

const NAV = [
  { href: '/', label: 'Executive overview', icon: LayoutDashboard },
  { href: '/sales', label: 'Sales & financial', icon: DollarSign },
  { href: '/technicians', label: 'Technician productivity', icon: Wrench },
  { href: '/parts', label: 'Parts profitability', icon: Car },
  { href: '/csi', label: 'CSI & NPS', icon: Smile },
  { href: '/complaints', label: 'Complaints (VOC)', icon: MessageSquareWarning },
  { href: '/warranty', label: 'Warranty claims', icon: ShieldCheck },
  { href: '/operations', label: 'WIP & operations', icon: ClipboardList },
]

const ADMIN_NAV = [
  { href: '/admin/upload', label: 'Upload data', icon: UploadCloud },
  { href: '/admin/users', label: 'Users & access', icon: UserCog },
]

export function Sidebar({ isAdmin, lastSyncAt }: { isAdmin: boolean; lastSyncAt: string | null }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const withQuery = (href: string) => (query ? `${href}?${query}` : href)

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-sm text-white shrink-0">MG</div>
        <div className="min-w-0">
          <div className="font-headline text-sm font-bold text-slate-900 uppercase tracking-tight leading-tight truncate">JMM Aftersales</div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider leading-tight">KPI Command Center</div>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Radar size={15} className="text-red-600" />
            Data sync
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500 tabular-nums">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            {relativeTime(lastSyncAt)}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={withQuery(href)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                active ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <NavIcon icon={Icon} />
              {label}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Admin</div>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                    active ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <NavIcon icon={Icon} />
                  {label}
                </Link>
              )
            })}
          </>
        )}
      </nav>
    </aside>
  )
}
