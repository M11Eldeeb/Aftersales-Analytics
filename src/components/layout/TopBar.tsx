import Link from 'next/link'
import { UploadCloud, BellRing, User } from 'lucide-react'
import { SignOutButton } from './SignOutButton'
import { BranchDateFilter } from '../filters/BranchDateFilter'
import { HeaderSearch } from './HeaderSearch'
import { getFailedUploadsCount } from '@/lib/dashboard/getViewer'

export async function TopBar({
  title, userName, userRole, branches,
}: {
  title: string
  userName: string
  userRole: string
  branches: { id: string; display_name: string }[]
}) {
  const isAdmin = userRole === 'admin'
  const failedUploads = isAdmin ? await getFailedUploadsCount() : 0

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3.5">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <h1 className="font-headline text-lg font-bold text-slate-900 truncate">{title}</h1>
          <BranchDateFilter branches={branches} />
        </div>
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <HeaderSearch />

          {isAdmin && (
            <Link
              href="/admin/upload"
              className="flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3.5 py-2 text-sm font-semibold hover:bg-slate-800 transition"
            >
              <UploadCloud size={15} />
              Upload Report
            </Link>
          )}

          {isAdmin && failedUploads > 0 && (
            <Link
              href="/admin/upload"
              title={`${failedUploads} failed upload${failedUploads > 1 ? 's' : ''} in the last 30 days`}
              className="relative p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-slate-800 transition"
            >
              <BellRing size={17} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />
            </Link>
          )}

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-right leading-tight hidden sm:block max-w-[140px]">
              <div className="text-sm font-semibold text-slate-800 truncate">{userName}</div>
              <div className="text-xs text-slate-400 capitalize">{userRole.replace('_', ' ')}</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
              <User size={15} className="text-white" />
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
