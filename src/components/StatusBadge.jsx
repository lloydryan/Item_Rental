export function StatusBadge({ status }) {
  const lowered = String(status).toLowerCase()
  const tone = lowered.includes('cancel') || lowered.includes('damage') || lowered.includes('missing') || lowered.includes('overdue') || lowered.includes('error')
    ? 'danger'
    : lowered.includes('pending') || lowered.includes('partial') || lowered.includes('ready') || lowered.includes('due') || lowered === 'unpaid'
      ? 'warning'
      : lowered.includes('active') || lowered === 'paid' || lowered.includes('available') || lowered.includes('completed') || lowered.includes('delivered') || lowered.includes('returned')
        ? 'success'
        : lowered.includes('inactive') || lowered.includes('archived') || lowered.includes('draft')
          ? 'neutral'
          : 'info'
  const tones = {
    success: 'border-success-indicator/20 bg-success-soft text-success',
    warning: 'border-warning-indicator/25 bg-warning-soft text-warning',
    danger: 'border-destructive-indicator/20 bg-destructive-soft text-destructive',
    info: 'border-information-indicator/20 bg-information-soft text-information',
    neutral: 'border-border bg-status-neutral-soft text-status-neutral',
  }
  return <span className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{status}</span>
}
