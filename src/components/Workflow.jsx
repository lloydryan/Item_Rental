export function Workflow() {
  const steps = ['Inquiry', 'Availability check', 'Reservation', 'Payment', 'Prepare items', 'Delivery / Release', 'Return / Pickup', 'Inspection', 'Complete rental']

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Business workflow</h2>
      <p className="mt-1 text-sm text-muted-foreground">Standard path from inquiry to completed rental.</p>
      <ol className="mt-5 grid gap-0">
        {steps.map((step, index) => <li className="flex items-center gap-3 border-b py-2.5 text-sm text-foreground last:border-0" key={step}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{index + 1}</span>{step}</li>)}
      </ol>
    </section>
  )
}
