export function ContentCard({ title, description, action, className = '', children }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-xs ${className}`}>
      {(title || description || action) && <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4"><div><h2 className="text-base font-semibold text-foreground">{title}</h2>{description && <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>}</div>{action}</header>}
      {children}
    </section>
  )
}

export function SummaryGroup({ children, className = '' }) {
  return <dl className={`grid overflow-hidden rounded-xl border bg-card shadow-xs [&>*+*]:border-l ${className}`}>{children}</dl>
}

export function SummaryItem({ label, value, hint }) {
  return <div className="min-w-0 px-5 py-3.5"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground tabular-nums">{value}</dd>{hint && <span className="mt-1 block text-xs text-subtle-foreground">{hint}</span>}</div>
}
