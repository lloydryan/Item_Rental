import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Button } from '../components/Button'
import { SummaryGroup, SummaryItem } from '../components/Card'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { Field, SelectField } from '../components/Field'
import { Dialog } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { today } from '../constants'
import { customerName, reservationById } from '../utils/lookups'
import { peso, rentalTotal, totalPaid } from '../utils/rental'

export function Payments({ state, actions }) {
  const searchParams = useSearchParams()
  const requestedRentalId = searchParams.get('rental')
  const initialRentalId = state.rentals.some((rental) => rental.id === requestedRentalId) ? requestedRentalId : state.rentals[0]?.id
  const [open, setOpen] = useState(Boolean(requestedRentalId && initialRentalId))
  const [form, setForm] = useState({ rentalId: initialRentalId, amount: '', paymentDate: today, method: 'Cash', referenceNumber: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [referenceError, setReferenceError] = useState('')
  const selectedRental = state.rentals.find((rental) => rental.id === form.rentalId)
  const selectedTotal = selectedRental ? rentalTotal(selectedRental) : 0
  const selectedPaid = selectedRental ? totalPaid(selectedRental.id, state.payments) : 0
  const remainingBalance = Math.max(0, selectedTotal - selectedPaid)
  const requiresReference = form.method !== 'Cash'

  async function save(event) {
    event.preventDefault()
    if (!form.rentalId) return
    const amount = Number(form.amount)
    setAmountError('')
    setReferenceError('')
    if (remainingBalance <= 0) { setAmountError('This rental is already fully paid.'); return }
    if (amount <= 0) { setAmountError('Enter an amount greater than zero.'); return }
    if (amount > remainingBalance) { setAmountError(`Amount cannot exceed the remaining balance of ${peso.format(remainingBalance)}.`); return }
    if (requiresReference && !form.referenceNumber.trim()) { setReferenceError(`Enter the ${form.method} reference number.`); return }
    setSaving(true); setError('')
    try { await actions.createPayment({ ...form, amount, referenceNumber: requiresReference ? form.referenceNumber : '' }); setForm({ ...form, amount: '', referenceNumber: '', notes: '' }); setAmountError(''); setReferenceError(''); setOpen(false) } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }

  const income = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  return (
    <Page title="Payments" eyebrow="Financial records" description="Review received payments and rental transaction references." actions={<Button type="button" onClick={() => setOpen(true)} disabled={!state.rentals.length}><Plus className="size-4" />Record payment</Button>}>
      <SummaryGroup className="grid-cols-2 sm:w-fit sm:min-w-96"><SummaryItem label="Recorded payments" value={state.payments.length} /><SummaryItem label="Total received" value={peso.format(income)} /></SummaryGroup>
      <DataTable title="Payment history" columns={['Reference', 'Customer', 'Rental', 'Amount', 'Method', 'Date', 'Status']} rows={state.payments.map((payment) => { const rental = state.rentals.find((record) => record.id === payment.rentalId); const reservation = rental ? reservationById(state, rental.reservationId) : null; return [payment.referenceNumber || '—', reservation ? customerName(state, reservation.customerId) : 'Unknown customer', payment.rentalId.slice(0, 8), peso.format(payment.amount), payment.method, payment.paymentDate, <StatusBadge key={payment.id} status="Recorded" />] })} />
      <Dialog open={open} onClose={() => setOpen(false)} title="Record payment" description="Apply a full or partial payment to an existing rental." footer={<><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="payment-form" loading={saving} disabled={!remainingBalance}><Plus className="size-4" />Record payment</Button></>}>
        <form id="payment-form" className="grid gap-4" onSubmit={save}>
          <Alert>{error}</Alert>
          <SelectField label="Rental" value={form.rentalId} onChange={(rentalId) => { setForm({ ...form, rentalId, amount: '' }); setAmountError('') }}>{state.rentals.map((rental) => { const reservation = reservationById(state, rental.reservationId); return <option key={rental.id} value={rental.id}>{rental.id.slice(0, 8)} · {customerName(state, reservation.customerId)}</option> })}</SelectField>
          <dl className="grid grid-cols-3 divide-x divide-border-subtle rounded-lg border bg-secondary/55 py-3 text-center">
            <div className="px-3"><dt className="text-[11px] font-medium text-muted-foreground">Rental total</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{peso.format(selectedTotal)}</dd></div>
            <div className="px-3"><dt className="text-[11px] font-medium text-muted-foreground">Paid</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{peso.format(selectedPaid)}</dd></div>
            <div className="px-3"><dt className="text-[11px] font-medium text-muted-foreground">Balance due</dt><dd className="mt-1 font-bold tabular-nums text-primary">{peso.format(remainingBalance)}</dd></div>
          </dl>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Amount" type="number" min="0.01" max={remainingBalance || undefined} step="0.01" value={form.amount} onChange={(amount) => { setForm({ ...form, amount }); setAmountError('') }} error={amountError} helper={`Maximum ${peso.format(remainingBalance)}`} required /><Field label="Payment date" type="date" value={form.paymentDate} onChange={(paymentDate) => setForm({ ...form, paymentDate })} required /></div>
          <SelectField label="Payment method" value={form.method} onChange={(method) => { setForm({ ...form, method, referenceNumber: method === 'Cash' ? '' : form.referenceNumber }); setReferenceError('') }} required><option>Cash</option><option>GCash</option><option>Maya</option><option>Bank Transfer</option></SelectField>
          {requiresReference && <Field label={`${form.method} reference number`} value={form.referenceNumber} onChange={(referenceNumber) => { setForm({ ...form, referenceNumber }); setReferenceError('') }} error={referenceError} helper="Use the transaction or transfer reference from the payment receipt." required />}
        </form>
      </Dialog>
    </Page>
  )
}
