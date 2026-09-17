import { redirect } from 'next/navigation'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { UploadPanel } from '@/components/admin/UploadPanel'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  if (!viewer) redirect('/login')
  if (viewer.role !== 'admin') redirect('/')

  return (
    <>
      <TopBar title="Upload data" userName={viewer.fullName} userRole={viewer.role} branches={branches} />
      <div className="p-6 max-w-4xl">
        <p className="text-sm text-slate-500 mb-6">
          Upload any Keyloop Autoline export — the WIP register, labor/parts sales, CSI survey, complaints,
          technician activity, warranty claims, or MSI targets. The importer detects each sheet by its column
          headers and routes it to the right table automatically, so you can upload more files than this or
          fewer, in any order, and re-upload the same period later without creating duplicates.
        </p>
        <UploadPanel />
      </div>
    </>
  )
}
