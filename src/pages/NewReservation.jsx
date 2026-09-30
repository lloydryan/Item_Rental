import { useState } from 'react'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Alert } from '../components/Feedback'
import { controlClasses, Field } from '../components/Field'
import { Page } from '../components/Page'
import { today } from '../constants'
import { customerName, itemName } from '../utils/lookups'
import { getAvailableQuantity, peso, reservationTotal } from '../utils/rental'

export function NewReservation({ state, actions }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ customerId: state.customers[0]?.id, startDate: today, endDate: today, eventLocation: '', deliveryRequired: true, deliveryCharge: 0, additionalCharges: 0, status: 'Confirmed', items: [{ itemId: state.items[0]?.id, quantity: 1 }] })
  const durationDays = Math.max(1, Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86_400_000) + 1)
  const previewTotal = reservationTotal({ ...form, durationDays }, state.items)

  function setLine(index, patch) { setForm((current) => ({ ...current, items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) })) }
  function validate() {
    if (!form.customerId) return 'Select a customer before continuing.'
    if (!form.eventLocation.trim()) return 'Enter the event location.'
    if (form.endDate < form.startDate) return 'The end date cannot be earlier than the start date.'
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
    <Page title="Create reservation" eyebrow="Reservations / New" description="Build the booking, confirm availability, and review pricing before submission." actions={<Button variant="ghost" type="button" onClick={() => navigate('/reservations')}><ArrowLeft className="size-4" />Back to reservations</Button>}>
      <form className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={save}>
        <div className="grid gap-8 rounded-xl border bg-card p-5 sm:p-6">
          <Alert>{error}</Alert>
          <section className="grid gap-4"><div className="border-b pb-3"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">01 · Customer</p><h2 className="mt-1 font-semibold text-gray-950">Who is making the reservation?</h2></div><label className="grid gap-1.5 text-sm font-medium text-gray-700">Customer<select className={controlClasses} value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>{state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label></section>
          <section className="grid gap-4"><div className="border-b pb-3"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">02 · Rental items</p><h2 className="mt-1 font-semibold text-gray-950">Select items and quantities</h2></div>{form.items.map((line, index) => { const item = state.items.find((record) => record.id === line.itemId); const available = item ? getAvailableQuantity(item, form.startDate, form.endDate, state.reservations) : 0; return <div className="grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-[minmax(0,1fr)_9rem]" key={index}><label className="grid gap-1.5 text-sm font-medium text-gray-700">Item<select className={controlClasses} value={line.itemId} onChange={(event) => setLine(index, { itemId: event.target.value })}>{state.items.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><Field label={`Quantity · ${available} available`} type="number" min="1" max={available} step="1" value={line.quantity} onChange={(quantity) => setLine(index, { quantity })} required /></div> })}<Button className="justify-self-start" variant="secondary" type="button" disabled={!state.items.length} onClick={() => setForm({ ...form, items: [...form.items, { itemId: state.items[0].id, quantity: 1 }] })}><Plus className="size-4" />Add item</Button></section>
          <section className="grid gap-4"><div className="border-b pb-3"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">03 · Schedule</p><h2 className="mt-1 font-semibold text-gray-950">Set the rental period and location</h2></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Start date" type="date" value={form.startDate} onChange={(startDate) => setForm({ ...form, startDate })} required /><Field label="End date" type="date" min={form.startDate} value={form.endDate} onChange={(endDate) => setForm({ ...form, endDate })} required /></div><Field label="Event location" value={form.eventLocation} onChange={(eventLocation) => setForm({ ...form, eventLocation })} required /></section>
          <section className="grid gap-4"><div className="border-b pb-3"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">04 · Delivery</p><h2 className="mt-1 font-semibold text-gray-950">Choose fulfillment and charges</h2></div><label className="flex items-center gap-3 text-sm font-medium text-gray-700"><input className="size-4 rounded border-gray-300 text-brand-600" type="checkbox" checked={form.deliveryRequired} onChange={(event) => setForm({ ...form, deliveryRequired: event.target.checked })} />Delivery required</label>{form.deliveryRequired && <Field label="Delivery charge" type="number" min="0" step="0.01" value={form.deliveryCharge} onChange={(deliveryCharge) => setForm({ ...form, deliveryCharge })} />}</section>
        </div>
        <aside className="grid gap-5 rounded-xl border bg-card p-5 xl:sticky xl:top-24"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Review</p><h2 className="mt-1 text-lg font-semibold text-foreground">Reservation summary</h2></div><dl className="grid gap-4 text-sm"><div><dt className="text-xs font-medium text-muted-foreground">Customer</dt><dd className="mt-1 font-medium text-foreground">{form.customerId ? customerName(state, form.customerId) : 'Not selected'}</dd></div><div><dt className="text-xs font-medium text-muted-foreground">Rental period</dt><dd className="mt-1 text-foreground">{form.startDate} – {form.endDate}<span className="block text-xs text-muted-foreground">{durationDays} {durationDays === 1 ? 'day' : 'days'}</span></dd></div></dl><div className="divide-y border-y">{form.items.map((line, index) => <div className="flex justify-between gap-3 py-3 text-sm" key={index}><span>{line.quantity} × {itemName(state, line.itemId)}</span><span className="tabular-nums text-muted-foreground">{peso.format(Number(line.quantity) * Number(state.items.find((item) => item.id === line.itemId)?.rentalPrice || 0) * durationDays)}</span></div>)}</div><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Total</span><strong className="text-lg tabular-nums text-foreground">{peso.format(previewTotal)}</strong></div><div className="grid gap-2"><Button type="submit" loading={saving} disabled={!state.customers.length || !state.items.length}><Check className="size-4" />Confirm reservation</Button><Button variant="ghost" type="button" onClick={() => navigate('/reservations')}>Cancel</Button></div></aside>
      </form>
    </Page>
  )
}
