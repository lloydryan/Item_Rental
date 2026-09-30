import { LoaderCircle } from 'lucide-react'

const variants = {
  primary: 'border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover',
  secondary: 'border-border bg-card text-foreground hover:bg-muted',
  outline: 'border-border bg-card text-foreground hover:bg-muted',
  ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
  destructive: 'border-destructive bg-destructive text-white hover:brightness-90',
}

const sizes = { sm: 'min-h-9 px-3 text-sm', default: 'min-h-10 px-4 text-sm', lg: 'min-h-11 px-5 text-sm', icon: 'size-10 p-0' }

export function Button({ variant = 'primary', size = 'default', loading = false, disabled, className = '', children, ...props }) {
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
