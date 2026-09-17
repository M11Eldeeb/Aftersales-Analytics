export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between gap-4 px-6 py-3.5">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-32 rounded-lg bg-slate-200" />
            <div className="h-8 w-32 rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-xl border border-slate-200 bg-slate-100" />
          <div className="h-72 rounded-xl border border-slate-200 bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
