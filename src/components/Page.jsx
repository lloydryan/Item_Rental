export function Page({ title, eyebrow, description, actions, children }) {
  return (
    <div className="grid gap-6 lg:gap-7">
      <header className="flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">{eyebrow}</p>
          <h1 className="mt-1.5 text-[1.75rem] font-bold leading-9 tracking-[-0.025em] text-foreground sm:text-[2rem]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
