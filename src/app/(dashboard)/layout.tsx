import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { getViewer, getLastSyncAt } from '@/lib/dashboard/getViewer'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (!viewer) redirect('/login')
  const lastSyncAt = await getLastSyncAt()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isAdmin={viewer.role === 'admin'} lastSyncAt={lastSyncAt} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  )
}
