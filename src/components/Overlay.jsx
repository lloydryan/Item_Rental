import { useEffect } from 'react'
import { MoreHorizontal, X } from 'lucide-react'
import { Button } from './Button'

function useDismiss(open, onClose) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  useDismiss(open, onClose)
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button className="absolute inset-0 bg-sidebar/50" type="button" aria-label="Close dialog" onClick={onClose} />
      <section className={`relative z-10 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl ${widths[size]}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <header className="flex items-start justify-between gap-4 border-b px-6 py-5"><div><h2 id="dialog-title" className="text-lg font-semibold text-foreground">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Close"><X className="size-5" /></Button></header>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-3 border-t bg-secondary px-6 py-4 sm:flex-row sm:justify-end">{footer}</footer>}
      </section>
    </div>
  )
}

export function Sheet({ open, onClose, title, description, children, footer }) {
  useDismiss(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button className="absolute inset-0 bg-sidebar/40" type="button" aria-label="Close sheet" onClick={onClose} />
      <section className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-card text-card-foreground shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <header className="flex items-start justify-between gap-4 border-b px-6 py-5"><div><h2 id="sheet-title" className="text-lg font-semibold text-foreground">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Close"><X className="size-5" /></Button></header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-3 border-t bg-secondary px-6 py-4 sm:flex-row sm:justify-end">{footer}</footer>}
      </section>
    </div>
  )
}

export function ActionMenu({ label = 'Open actions', children }) {
  return (
    <details className="relative inline-block text-left">
      <summary className="grid size-9 list-none place-items-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden" aria-label={label}><MoreHorizontal className="size-5" /></summary>
      <div className="absolute right-0 z-30 mt-1 min-w-44 rounded-lg border bg-card p-1.5 text-left shadow-lg">{children}</div>
    </details>
  )
}

export function MenuItem({ children, onClick, tone = 'default' }) {
  return <button className={`flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm transition-colors ${tone === 'danger' ? 'text-destructive hover:bg-destructive-soft' : 'text-foreground hover:bg-muted'}`} type="button" onClick={(event) => { onClick?.(); event.currentTarget.closest('details')?.removeAttribute('open') }}>{children}</button>
}
