export function ChartCard({
  title, subtitle, children, className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="font-headline text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[160px] text-sm text-slate-400 text-center px-4">
      {message}
    </div>
  )
}
