'use client'

import { useCallback, useState } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { ToastContext } from './toast-context'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, tone = 'success') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current.slice(-2), { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-2" aria-live="polite">
        {toasts.map((item) => {
          const Icon = item.tone === 'error' ? XCircle : CheckCircle2
          return <div key={item.id} className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm text-foreground shadow-lg"><Icon className={`mt-0.5 size-5 shrink-0 ${item.tone === 'error' ? 'text-destructive' : 'text-success'}`} aria-hidden="true" /><span className="flex-1">{item.message}</span><button className="rounded-md p-1 text-subtle-foreground hover:bg-muted hover:text-foreground" type="button" aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((toastItem) => toastItem.id !== item.id))}><X className="size-4" /></button></div>
        })}
      </div>
    </ToastContext.Provider>
  )
}
