'use client'

import { useState, useCallback } from 'react'
import { UploadCloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ingestFile, type IngestionProgress, type IngestionSummary } from '@/lib/ingestion/runner'

interface FileJob {
  id: string
  fileName: string
  progress: IngestionProgress | null
  summary: IngestionSummary | null
  error: string | null
}

export function UploadPanel() {
  const [jobs, setJobs] = useState<FileJob[]>([])
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const supabase = createClient()
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      const id = `${file.name}-${Date.now()}`
      setJobs((prev) => [{ id, fileName: file.name, progress: null, summary: null, error: null }, ...prev])

      try {
        const summary = await ingestFile(supabase, file, (progress) => {
          setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, progress } : j)))
        })
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, summary } : j)))
      } catch (err) {
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, error: err instanceof Error ? err.message : String(err) } : j)))
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
        }}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
        }`}
      >
        <UploadCloud className="mx-auto mb-3 text-slate-400" size={32} />
        <p className="text-sm text-slate-600 mb-1">Drag and drop Keyloop Autoline exports here</p>
        <p className="text-xs text-slate-400 mb-4">.xlsx, .xls, .csv, or the maintenance schedule .html — any mix, any number of files</p>
        <label className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2 cursor-pointer hover:bg-slate-800 transition">
          Choose files
          <input
            type="file" multiple className="hidden"
            accept=".xlsx,.xls,.csv,.html,.htm"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </label>
      </div>

      {jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  )
}

function JobCard({ job }: { job: FileJob }) {
  const pct = job.progress && job.progress.rowsTotal > 0
    ? Math.min(100, Math.round((job.progress.rowsDone / job.progress.rowsTotal) * 100))
    : job.summary ? 100 : 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          {job.error ? <XCircle size={16} className="text-red-500" />
            : job.summary ? <CheckCircle2 size={16} className="text-emerald-500" />
            : <Loader2 size={16} className="animate-spin text-slate-400" />}
          {job.fileName}
        </div>
        {job.progress && !job.summary && !job.error && (
          <span className="text-xs text-slate-400">{job.progress.batchLabel}</span>
        )}
      </div>

      {!job.summary && !job.error && (
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {job.error && <p className="text-xs text-red-600 mt-1">{job.error}</p>}

      {job.summary && (
        <div className="mt-2 space-y-1">
          {job.summary.batches.map((b) => (
            <div key={b.label} className="flex justify-between text-xs text-slate-500">
              <span>{b.label}</span>
              <span className="tabular-nums">{b.upserted.toLocaleString()} rows</span>
            </div>
          ))}
          {job.summary.unrecognizedSheets.length > 0 && (
            <p className="text-xs text-amber-600 pt-1">
              Skipped unrecognized sheet(s): {job.summary.unrecognizedSheets.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
