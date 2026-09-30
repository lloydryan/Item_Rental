export function Metric({ label, value, tone, icon: Icon }) {
  return (
    <article className={`flex min-h-28 flex-col justify-between rounded-xl border p-5 ${tone === 'warning' ? 'border-warning-indicator/25 bg-warning-soft' : 'bg-card'}`}>
      <div className="flex items-center justify-between gap-3 text-sm font-medium text-muted-foreground">
        <span>{label}</span>
        {Icon && <Icon className="size-4 text-subtle-foreground" aria-hidden="true" />}
      </div>
      <strong className="mt-5 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</strong>
    </article>
  )
}
