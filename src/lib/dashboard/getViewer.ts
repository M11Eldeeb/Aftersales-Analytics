import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export interface Viewer {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'branch_manager' | 'viewer'
}

// Both the (dashboard) layout and every page call this on each navigation to read
// role/name. Wrapping in React's cache() dedupes those into a single Supabase Auth
// + profiles round trip per request instead of firing it twice.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name || user.email || 'User',
    role: (profile?.role as Viewer['role']) ?? 'viewer',
  }
})

export const getBranches = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.from('branches').select('id, display_name').order('display_name')
  return data ?? []
})

// Aggregate-only timestamp exposed via a SECURITY DEFINER function (get_last_sync_at)
// so every viewer can see data freshness without needing read access to import_batches
// rows, which stay admin/uploader-only.
export const getLastSyncAt = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_last_sync_at')
  return (data as string | null) ?? null
})

// Admin-only signal (import_batches RLS already restricts this to admins/uploader);
// used to surface a real notification instead of a decorative fake one.
export const getFailedUploadsCount = cache(async (): Promise<number> => {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { count } = await supabase
    .from('import_batches')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('started_at', since)
  return count ?? 0
})
