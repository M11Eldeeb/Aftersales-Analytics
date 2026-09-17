'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProfileRow {
  id: string
  full_name: string | null
  role: 'admin' | 'branch_manager' | 'viewer'
  is_active: boolean
}

interface BranchRow {
  id: string
  display_name: string
}

export function UsersPanel({
  initialProfiles, branches, initialAccess,
}: {
  initialProfiles: ProfileRow[]
  branches: BranchRow[]
  initialAccess: { user_id: string; branch_id: string }[]
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [access, setAccess] = useState(initialAccess)
  const [, startTransition] = useTransition()
  const supabase = createClient()

  function accessSet(userId: string) {
    return new Set(access.filter((a) => a.user_id === userId).map((a) => a.branch_id))
  }

  function updateRole(userId: string, role: ProfileRow['role']) {
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, role } : p)))
    startTransition(async () => {
      await supabase.from('profiles').update({ role }).eq('id', userId)
    })
  }

  function toggleActive(userId: string, is_active: boolean) {
    setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, is_active } : p)))
    startTransition(async () => {
      await supabase.from('profiles').update({ is_active }).eq('id', userId)
    })
  }

  function toggleBranch(userId: string, branchId: string, enabled: boolean) {
    setAccess((prev) =>
      enabled ? [...prev, { user_id: userId, branch_id: branchId }]
        : prev.filter((a) => !(a.user_id === userId && a.branch_id === branchId))
    )
    startTransition(async () => {
      if (enabled) {
        await supabase.from('user_branch_access').insert({ user_id: userId, branch_id: branchId })
      } else {
        await supabase.from('user_branch_access').delete().eq('user_id', userId).eq('branch_id', branchId)
      }
    })
  }

  return (
    <div className="space-y-4">
      {profiles.map((p) => {
        const granted = accessSet(p.id)
        return (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-medium text-slate-800">{p.full_name || 'Unnamed user'}</div>
                <div className="text-xs text-slate-400">{p.id}</div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={p.role} onChange={(e) => updateRole(p.id, e.target.value as ProfileRow['role'])}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="branch_manager">Branch manager</option>
                  <option value="admin">Admin</option>
                </select>
                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input type="checkbox" checked={p.is_active} onChange={(e) => toggleActive(p.id, e.target.checked)} />
                  Active
                </label>
              </div>
            </div>

            {p.role !== 'admin' && (
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Branch access</div>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => {
                    const on = granted.has(b.id)
                    return (
                      <button
                        key={b.id}
                        onClick={() => toggleBranch(p.id, b.id, !on)}
                        className={`text-xs rounded-full px-2.5 py-1 border transition ${
                          on ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {b.display_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
