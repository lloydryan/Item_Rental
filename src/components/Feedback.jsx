import { AlertCircle, Inbox, Info } from 'lucide-react'

export function Alert({ children }) {
  if (!children) return null
  return <div className="flex items-start gap-3 rounded-lg border border-destructive-indicator/20 bg-destructive-soft px-4 py-3 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{children}</span></div>
}

export function Notice({ children }) {
  if (!children) return null
  return <div className="flex items-start gap-3 rounded-lg border border-information-indicator/20 bg-information-soft px-4 py-3 text-sm leading-5 text-information"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{children}</span></div>
}

export function EmptyState({ title = 'No records found', description = 'There are no records to display yet.', action }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-secondary/60 px-6 py-10 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-lg bg-card text-muted-foreground ring-1 ring-border"><Inbox className="size-5" aria-hidden="true" /></span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />
}
