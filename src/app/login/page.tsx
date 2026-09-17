'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)
    const supabase = createClient()

    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      router.push(searchParams.get('next') || '/')
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setNotice('Account created. New accounts start with no branch access — ask an admin to grant it from Admin > Users.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">MG Aftersales Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">JIAD Motors &middot; Aftersales KPI Center</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex mb-6 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`flex-1 rounded-md py-1.5 transition ${mode === 'sign-in' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`flex-1 rounded-md py-1.5 transition ${mode === 'sign-up' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'sign-up' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-emerald-600">{notice}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2.5 hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
