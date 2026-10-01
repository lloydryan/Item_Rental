export function Metric({ label, value, tone, icon: Icon, helper, featured = false }) {
  return (
    <article className={`flex flex-col justify-between rounded-xl border p-5 shadow-xs ${featured ? 'min-h-40 border-primary/20 bg-primary text-primary-foreground sm:p-6' : `min-h-32 ${tone === 'warning' ? 'border-warning-indicator/25 bg-warning-soft' : 'bg-card'}`}`}>
      <div className={`flex items-center justify-between gap-3 text-[13px] font-medium ${featured ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
        <span>{label}</span>
        {Icon && <span className={`grid size-8 place-items-center rounded-lg ${featured ? 'bg-white/10 text-white' : 'bg-secondary text-muted-foreground'}`}><Icon className="size-4" aria-hidden="true" /></span>}
      </div>
      <div className="mt-5"><strong className={`block font-bold tabular-nums tracking-[-0.03em] ${featured ? 'text-3xl text-white sm:text-4xl' : 'text-2xl text-foreground'}`}>{value}</strong>{helper && <p className={`mt-2 text-xs leading-5 ${featured ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{helper}</p>}</div>
    </article>
  )
}
