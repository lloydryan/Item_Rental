import { Search } from 'lucide-react'

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block w-full max-w-md">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden="true" />
      <input className="min-h-10 w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm text-foreground shadow-xs placeholder:text-subtle-foreground focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary-border/45" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}
