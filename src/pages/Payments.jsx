import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { controlClasses, Field } from '../components/Field'
import { Dialog } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { today } from '../constants'
import { customerName, reservationById } from '../utils/lookups'
import { peso } from '../utils/rental'

export function Payments({ state, actions }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ rentalId: state.rentals[0]?.id, amount: '', paymentDate: today, method: 'Cash', referenceNumber: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [amountError, setAmountError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!form.rentalId) return
    if (Number(form.amount) <= 0) { setAmountError('Enter an amount greater than zero.'); return }
    setSaving(true); setError('')
    try { await actions.createPayment(form); setForm({ ...form, amount: '', referenceNumber: '', notes: '' }); setAmountError(''); setOpen(false) } catch (saveError) { setError(saveError.message) } finally { setSaving(false) }
  }

  const income = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  return (
    <Page title="Payments" eyebrow="Financial records" description="Review received payments and rental transaction references." actions={<Button type="button" onClick={() => setOpen(true)} disabled={!state.rentals.length}><Plus className="size-4" />Record payment</Button>}>
      <div className="grid grid-cols-2 divide-x rounded-xl border bg-card sm:w-fit"><div className="px-5 py-3"><span className="block text-xs font-medium text-muted-foreground">Recorded payments</span><strong className="mt-1 block text-xl tabular-nums">{state.payments.length}</strong></div><div className="px-5 py-3"><span className="block text-xs font-medium text-muted-foreground">Total received</span><strong className="mt-1 block text-xl tabular-nums">{peso.format(income)}</strong></div></div>
      <DataTable title="Payment history" columns={['Reference', 'Customer', 'Rental', 'Amount', 'Method', 'Date', 'Status']} rows={state.payments.map((payment) => { const rental = state.rentals.find((record) => record.id === payment.rentalId); const reservation = rental ? reservationById(state, rental.reservationId) : null; return [payment.referenceNumber || '—', reservation ? customerName(state, reservation.customerId) : 'Unknown customer', payment.rentalId.slice(0, 8), peso.format(payment.amount), payment.method, payment.paymentDate, <StatusBadge key={payment.id} status="Recorded" />] })} />
      <Dialog open={open} onClose={() => setOpen(false)} title="Record payment" description="Apply a received payment to an existing rental." footer={<><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="payment-form" loading={saving}><Plus className="size-4" />Record payment</Button></>}>
        <form id="payment-form" className="grid gap-4" onSubmit={save}><Alert>{error}</Alert><label className="grid gap-1.5 text-sm font-medium text-gray-700">Rental<select className={controlClasses} value={form.rentalId} onChange={(event) => setForm({ ...form, rentalId: event.target.value })}>{state.rentals.map((rental) => { const reservation = reservationById(state, rental.reservationId); return <option key={rental.id} value={rental.id}>{rental.id.slice(0, 8)} · {customerName(state, reservation.customerId)}</option> })}</select></label><div className="grid gap-4 sm:grid-cols-2"><Field label="Amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} error={amountError} required /><Field label="Payment date" type="date" value={form.paymentDate} onChange={(paymentDate) => setForm({ ...form, paymentDate })} required /></div><Field label="Payment method" value={form.method} onChange={(method) => setForm({ ...form, method })} required /><Field label="Reference number" value={form.referenceNumber} onChange={(referenceNumber) => setForm({ ...form, referenceNumber })} helper="Optional receipt, transfer, or transaction reference." /></form>
      </Dialog>
    </Page>
  )
}
