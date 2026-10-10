import { useState } from 'react'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { useNavigate } from '../lib/navigation'
import { Button } from '../components/Button'
import { Alert } from '../components/Feedback'
import { Field, SelectField } from '../components/Field'
import { FormSection } from '../components/FormSection'
import { Page } from '../components/Page'
import { today } from '../constants'
import { customerName, itemName } from '../utils/lookups'
import { getAvailableQuantity, peso, reservationTotal } from '../utils/rental'

export function NewReservation({ state, actions }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ customerId: state.customers[0]?.id, startDate: today, endDate: today, eventLocation: '', deliveryRequired: true, deliveryCharge: 0, additionalCharges: 0, status: 'Draft', items: [{ itemId: state.items[0]?.id, quantity: 1 }] })
  const dateError = form.startDate && form.endDate && form.endDate < form.startDate ? 'End date must be on or after the start date.' : ''
  const durationDays = Math.max(1, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86_400_000) + 1)
  const previewTotal = reservationTotal({ ...form, durationDays }, state.items)

  function setLine(index, patch) { setForm((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) })) }
  function validate() {
    if (!form.customerId) return 'Select a customer before continuing.'
    if (!form.eventLocation.trim()) return 'Enter the event location.'
    if (dateError) return dateError
    for (const line of form.items) {
      const item = state.items.find((candidate) => candidate.id === line.itemId)
      const available = item ? getAvailableQuantity(item, form.startDate, form.endDate, state.reservations) : 0
      if (Number(line.quantity) < 1) return 'Every item needs a quantity of at least one.'
      if (Number(line.quantity) > available) return `${item.name} has only ${available} available for this period.`
    }
    return ''
  }
  async function save(event) {
    event.preventDefault()
    const validation = validate()
    if (validation) { setError(validation); return }
    setSaving(true); setError('')
    try { await actions.createReservation(form); navigate('/reservations') } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }

  return (
    <Page title="Create reservation" eyebrow="Reservations / New" description="Save the booking details, then confirm it when the client is ready to proceed." actions={<Button variant="ghost" type="button" onClick={() => navigate('/reservations')}><ArrowLeft className="size-4" />Back to reservations</Button>}>
      <form className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={save}>
        <div className="grid gap-8 rounded-xl border bg-card p-5 shadow-xs sm:p-6">
          <Alert>{error}</Alert>
          <FormSection step="01 · Customer" title="Who is making the reservation?">
            <SelectField label="Customer" value={form.customerId} onChange={(customerId) => setForm({ ...form, customerId })} required>{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</SelectField>
          </FormSection>
          <FormSection step="02 · Rental items" title="Select items and quantities">
            <div className="grid gap-3">{form.items.map((line, index) => { const item = state.items.find((record) => record.id === line.itemId); const available = item ? getAvailableQuantity(item, form.startDate, form.endDate, state.reservations) : 0; return <div className="grid gap-4 rounded-lg border border-border-subtle bg-secondary/70 p-4 sm:grid-cols-[minmax(0,1fr)_9rem]" key={index}><SelectField label="Item" value={line.itemId} onChange={(itemId) => setLine(index, { itemId })}>{state.items.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</SelectField><Field label={`Quantity · ${available} available`} type="number" min="1" max={available} step="1" value={line.quantity} onChange={(quantity) => setLine(index, { quantity })} required /></div> })}</div>
            <Button className="justify-self-start" variant="secondary" type="button" disabled={!state.items.length} onClick={() => setForm({ ...form, items: [...form.items, { itemId: state.items[0].id, quantity: 1 }] })}><Plus className="size-4" />Add item</Button>
          </FormSection>
          <FormSection step="03 · Schedule" title="Set the rental period and location">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Start date" type="date" value={form.startDate} onChange={(startDate) => setForm({ ...form, startDate })} required /><Field label="End date" type="date" min={form.startDate} value={form.endDate} onChange={(endDate) => setForm({ ...form, endDate })} error={dateError} required /></div>
            <Field label="Event location" value={form.eventLocation} onChange={(eventLocation) => setForm({ ...form, eventLocation })} required />
          </FormSection>
          <FormSection step="04 · Delivery" title="Choose fulfillment and charges">
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border-subtle bg-secondary/70 px-3 text-sm font-medium text-foreground"><input className="size-4 rounded border-border accent-primary" type="checkbox" checked={form.deliveryRequired} onChange={(event) => setForm({ ...form, deliveryRequired: event.target.checked })} />Delivery required</label>
            {form.deliveryRequired && <Field label="Delivery charge" type="number" min="0" step="0.01" value={form.deliveryCharge} onChange={(deliveryCharge) => setForm({ ...form, deliveryCharge })} />}
          </FormSection>
        </div>
        <aside className="grid gap-5 rounded-xl border bg-card p-5 shadow-xs xl:sticky xl:top-24"><div><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">Review</p><h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Reservation summary</h2></div><dl className="grid gap-4 text-sm"><div><dt className="text-xs font-medium text-muted-foreground">Customer</dt><dd className="mt-1 font-medium text-foreground">{form.customerId ? customerName(state, form.customerId) : 'Not selected'}</dd></div><div><dt className="text-xs font-medium text-muted-foreground">Rental period</dt><dd className="mt-1 text-foreground">{form.startDate} – {form.endDate}<span className="block text-xs text-muted-foreground">{durationDays} {durationDays === 1 ? 'day' : 'days'}</span></dd></div></dl><div className="divide-y divide-border-subtle border-y">{form.items.map((line, index) => <div className="flex justify-between gap-3 py-3 text-sm" key={index}><span>{line.quantity} × {itemName(state, line.itemId)}</span><span className="tabular-nums text-muted-foreground">{peso.format(Number(line.quantity) * Number(state.items.find((item) => item.id === line.itemId)?.rentalPrice || 0) * durationDays)}</span></div>)}</div><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Total</span><strong className="text-xl tabular-nums tracking-tight text-foreground">{peso.format(previewTotal)}</strong></div><p className="text-xs leading-5 text-muted-foreground">New reservations are saved as drafts. Confirm the reservation from the list after the client agrees.</p><div className="grid gap-2"><Button type="submit" loading={saving} disabled={!state.customers.length || !state.items.length}><Check className="size-4" />Save reservation</Button><Button variant="ghost" type="button" onClick={() => navigate('/reservations')}>Cancel</Button></div></aside>
      </form>
    </Page>
  )
}
