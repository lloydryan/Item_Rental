export const controlClasses = 'min-h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-xs transition placeholder:text-subtle-foreground hover:border-subtle-foreground focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary-border/45 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground'

export function Field({ label, value, onChange, type = 'text', required = false, helper, error, ...props }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      <span>{label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</span>
      <input className={`${controlClasses} ${error ? 'border-destructive-indicator focus:border-destructive focus:ring-destructive-soft' : ''}`} type={type} value={value} required={required} aria-invalid={Boolean(error)} onChange={(event) => onChange(event.target.value)} {...props} />
      {helper && !error && <span className="text-xs font-normal text-muted-foreground">{helper}</span>}
      {error && <span className="text-xs font-medium text-destructive">{error}</span>}
    </label>
  )
}
