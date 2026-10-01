import { LoaderCircle } from 'lucide-react'

const variants = {
  primary: 'border-primary bg-primary text-primary-foreground shadow-xs hover:border-primary-hover hover:bg-primary-hover',
  secondary: 'border-border-subtle bg-secondary text-foreground hover:border-border hover:bg-muted',
  outline: 'border-border bg-card text-foreground shadow-xs hover:bg-secondary',
  ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  destructive: 'border-destructive bg-destructive text-white shadow-xs hover:brightness-95',
}

const sizes = { sm: 'min-h-9 px-3 text-[13px]', default: 'min-h-10 px-4 text-sm', lg: 'min-h-11 px-5 text-sm', icon: 'size-10 p-0' }

export function Button({ variant = 'primary', size = 'default', loading = false, disabled, className = '', children, ...props }) {
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-border disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
