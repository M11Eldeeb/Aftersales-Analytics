import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBranches, getViewer } from '@/lib/dashboard/getViewer'
import { TopBar } from '@/components/layout/TopBar'
import { UsersPanel } from '@/components/admin/UsersPanel'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const [viewer, branches] = await Promise.all([getViewer(), getBranches()])
  if (!viewer) redirect('/login')
  if (viewer.role !== 'admin') redirect('/')

  const supabase = await createClient()
  const [{ data: profiles }, { data: access }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, is_active').order('full_name'),
    supabase.from('user_branch_access').select('user_id, branch_id'),
  ])

  return (
    <>
      <TopBar title="Users & access" userName={viewer.fullName} userRole={viewer.role} branches={branches} />
      <div className="p-6 max-w-3xl">
        <p className="text-sm text-slate-500 mb-6">
          New sign-ups start as a viewer with no branch access, so they see nothing until you grant it here.
          Admins always see every branch.
        </p>
        <UsersPanel initialProfiles={profiles ?? []} branches={branches} initialAccess={access ?? []} />
      </div>
    </>
  )
}
