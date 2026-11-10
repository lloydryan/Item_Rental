import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, X } from 'lucide-react'
import { Button } from './Button'

function useDismiss(open, onClose, containerRef) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusable = () => [...(containerRef.current?.querySelectorAll(focusableSelector) || [])]
    const focusFrame = window.requestAnimationFrame(() => focusable()[0]?.focus())
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [open, containerRef])
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  const dialogRef = useRef(null)
  useDismiss(open, onClose, dialogRef)
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="presentation">
      <button className="absolute inset-0 bg-sidebar/55 backdrop-blur-[1px]" type="button" aria-label="Close dialog" onClick={onClose} />
      <section ref={dialogRef} className={`relative z-10 flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg ${widths[size]}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={description ? 'dialog-description' : undefined}>
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 sm:px-6"><div><h2 id="dialog-title" className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>{description && <p id="dialog-description" className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>}</div><Button className="-mr-2 -mt-1" variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Close"><X className="size-5" /></Button></header>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-2 border-t border-border-subtle bg-secondary/60 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</footer>}
      </section>
    </div>
  )
}

export function Sheet({ open, onClose, title, description, children, footer }) {
  const sheetRef = useRef(null)
  useDismiss(open, onClose, sheetRef)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button className="absolute inset-0 bg-sidebar/45 backdrop-blur-[1px]" type="button" aria-label="Close sheet" onClick={onClose} />
      <section ref={sheetRef} className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l bg-card text-card-foreground shadow-lg" role="dialog" aria-modal="true" aria-labelledby="sheet-title" aria-describedby={description ? 'sheet-description' : undefined}>
        <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-6 py-5"><div><h2 id="sheet-title" className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>{description && <p id="sheet-description" className="mt-1 text-sm text-muted-foreground">{description}</p>}</div><Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Close"><X className="size-5" /></Button></header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-col-reverse gap-2 border-t border-border-subtle bg-secondary/60 px-6 py-4 sm:flex-row sm:justify-end">{footer}</footer>}
      </section>
    </div>
  )
}

export function ActionMenu({ label = 'Open actions', children }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  function positionMenu() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuWidth = menuRef.current?.offsetWidth || 176
    const menuHeight = menuRef.current?.offsetHeight || 48
    const gap = 6
    const viewportPadding = 8
    const left = Math.min(window.innerWidth - menuWidth - viewportPadding, Math.max(viewportPadding, rect.right - menuWidth))
    const opensAbove = rect.bottom + gap + menuHeight > window.innerHeight - viewportPadding
    const top = opensAbove ? Math.max(viewportPadding, rect.top - menuHeight - gap) : rect.bottom + gap
    setPosition({ left, top })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    positionMenu()
    const frame = window.requestAnimationFrame(() => {
      positionMenu()
      menuRef.current?.querySelector('button')?.focus()
    })
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span className="inline-flex">
      <button ref={triggerRef} className="grid size-9 place-items-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground" type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal className="size-5" /></button>
      {open && createPortal(<div ref={menuRef} className="fixed z-60 min-w-44 rounded-lg border bg-card p-1.5 text-left shadow-lg" style={position} role="menu" onClick={() => setOpen(false)}>{children}</div>, document.body)}
    </span>
  )
}

export function MenuItem({ children, onClick, tone = 'default' }) {
  return <button className={`flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm transition-colors ${tone === 'danger' ? 'text-destructive hover:bg-destructive-soft' : 'text-foreground hover:bg-muted'}`} type="button" role="menuitem" onClick={onClick}>{children}</button>
}
