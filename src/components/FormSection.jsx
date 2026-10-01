export function FormSection({ step, title, description, children }) {
  return (
    <section className="grid gap-4">
      <div className="border-b border-border-subtle pb-3">
        {step && <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">{step}</p>}
        <h2 className={`${step ? 'mt-1' : ''} text-base font-semibold text-foreground`}>{title}</h2>
        {description && <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}
