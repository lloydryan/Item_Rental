import { useRef, useState } from 'react'
import { CheckCircle2, Plus } from 'lucide-react'
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

function rentalBalance(rental, payments) {
  return Math.max(0, Math.round((rentalTotal(rental) - totalPaid(rental.id, payments)) * 100) / 100)
}

function validateAmount(value, balance, showRequired = false) {
  if (value === '') return showRequired ? 'Enter a payment amount.' : ''
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount greater than zero.'
  if (Math.abs(amount - Math.round(amount * 100) / 100) > 0.000000001) return 'Enter no more than two decimal places.'
  if (amount > balance) return `Amount cannot exceed the remaining balance of ${peso.format(balance)}.`
  return ''
}

export function Payments({ state, actions }) {
  const searchParams = useSearchParams()
  const requestedRentalId = searchParams.get('rental')
  const payableRentals = state.rentals.filter((rental) => rentalBalance(rental, state.payments) > 0)
  const requestedRentalIsPayable = payableRentals.some((rental) => rental.id === requestedRentalId)
  const initialRentalId = requestedRentalIsPayable ? requestedRentalId : payableRentals[0]?.id
  const [open, setOpen] = useState(Boolean(requestedRentalId && requestedRentalIsPayable))
  const [form, setForm] = useState({ rentalId: initialRentalId, amount: '', paymentDate: today, method: 'Cash', referenceNumber: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const savingRef = useRef(false)
  const requestKeyRef = useRef(null)

  const selectedRental = payableRentals.find((rental) => rental.id === form.rentalId)
  const selectedTotal = selectedRental ? rentalTotal(selectedRental) : 0
  const selectedPaid = selectedRental ? totalPaid(selectedRental.id, state.payments) : 0
  const remainingBalance = selectedRental ? rentalBalance(selectedRental, state.payments) : 0
  const amount = Number(form.amount)
  const amountError = validateAmount(form.amount, remainingBalance, attempted)
  const requiresReference = form.method !== 'Cash'
  const referenceError = requiresReference && attempted && !form.referenceNumber.trim() ? `Enter the ${form.method} reference number.` : ''
  const validAmount = form.amount !== '' && !validateAmount(form.amount, remainingBalance)
  const newBalance = validAmount ? Math.max(0, Math.round((remainingBalance - amount) * 100) / 100) : remainingBalance
  const formIsValid = Boolean(form.rentalId && form.paymentDate && validAmount && (!requiresReference || form.referenceNumber.trim()))

  function openPayment() {
    const rentalId = payableRentals[0]?.id
    if (!rentalId) return
    setForm({ rentalId, amount: '', paymentDate: today, method: 'Cash', referenceNumber: '', notes: '' })
    setAttempted(false)
    setError('')
    requestKeyRef.current = null
    setOpen(true)
  }

  function closePayment() {
    if (savingRef.current) return
    setOpen(false)
    setAttempted(false)
    setError('')
  }

  async function save(event) {
    event.preventDefault()
    setAttempted(true)
    if (!formIsValid || savingRef.current) return

    savingRef.current = true
    setSaving(true)
    setError('')
    requestKeyRef.current ||= crypto.randomUUID()

    try {
      const paymentId = await actions.createPayment({
        ...form,
        amount,
        referenceNumber: requiresReference ? form.referenceNumber.trim() : '',
        requestKey: requestKeyRef.current,
      })
      const reservation = reservationById(state, selectedRental.reservationId)
      setReceipt({
        id: paymentId,
        rentalId: selectedRental.id,
        customer: customerName(state, reservation.customerId),
        amount,
        method: form.method,
        referenceNumber: requiresReference ? form.referenceNumber.trim() : '',
        newBalance,
      })
      setOpen(false)
      setAttempted(false)
      requestKeyRef.current = null
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const income = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  return (
    <Page title="Payments" eyebrow="Financial records" description="Review received payments and rental transaction references." actions={<Button type="button" onClick={openPayment} disabled={!payableRentals.length}><Plus className="size-4" />Record payment</Button>}>
      <SummaryGroup className="grid-cols-2 sm:w-fit sm:min-w-96"><SummaryItem label="Recorded payments" value={state.payments.length} /><SummaryItem label="Total received" value={peso.format(income)} /></SummaryGroup>
      <DataTable title="Payment history" columns={['Reference', 'Customer', 'Rental', 'Amount', 'Method', 'Date', 'Status']} rows={state.payments.map((payment) => { const rental = state.rentals.find((record) => record.id === payment.rentalId); const reservation = rental ? reservationById(state, rental.reservationId) : null; return [payment.referenceNumber || '—', reservation ? customerName(state, reservation.customerId) : 'Unknown customer', payment.rentalId.slice(0, 8), peso.format(payment.amount), payment.method, payment.paymentDate, <StatusBadge key={payment.id} status="Recorded" />] })} />

      <Dialog
        open={open}
        onClose={closePayment}
        title="Record payment"
        description="Only rentals with an outstanding balance are shown."
        footer={<><Button variant="outline" type="button" onClick={closePayment} disabled={saving}>Cancel</Button><Button type="submit" form="payment-form" loading={saving} disabled={!formIsValid}><Plus className="size-4" />Record payment</Button></>}
      >
        <form id="payment-form" className="grid gap-4" onSubmit={save}>
          <Alert>{error}</Alert>
          <SelectField label="Rental" value={form.rentalId} onChange={(rentalId) => { setForm({ ...form, rentalId, amount: '' }); setAttempted(false); setError(''); requestKeyRef.current = null }}>
            {payableRentals.map((rental) => { const reservation = reservationById(state, rental.reservationId); return <option key={rental.id} value={rental.id}>{rental.id.slice(0, 8)} · {customerName(state, reservation.customerId)} · {peso.format(rentalBalance(rental, state.payments))} due</option> })}
          </SelectField>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle text-center sm:grid-cols-4">
            <div className="bg-secondary/70 px-3 py-3"><dt className="text-[11px] font-medium text-muted-foreground">Rental total</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{peso.format(selectedTotal)}</dd></div>
            <div className="bg-secondary/70 px-3 py-3"><dt className="text-[11px] font-medium text-muted-foreground">Already paid</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{peso.format(selectedPaid)}</dd></div>
            <div className="bg-secondary/70 px-3 py-3"><dt className="text-[11px] font-medium text-muted-foreground">Current balance</dt><dd className="mt-1 font-semibold tabular-nums text-foreground">{peso.format(remainingBalance)}</dd></div>
            <div className="bg-primary-soft px-3 py-3"><dt className="text-[11px] font-medium text-primary">New balance</dt><dd className="mt-1 font-bold tabular-nums text-primary">{peso.format(newBalance)}</dd></div>
          </dl>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" type="number" min="0.01" max={remainingBalance || undefined} step="0.01" value={form.amount} onChange={(nextAmount) => { setForm({ ...form, amount: nextAmount }); setError('') }} error={amountError} helper={`Maximum ${peso.format(remainingBalance)}`} required />
            <Field label="Payment date" type="date" value={form.paymentDate} onChange={(paymentDate) => setForm({ ...form, paymentDate })} required />
          </div>
          <SelectField label="Payment method" value={form.method} onChange={(method) => { setForm({ ...form, method, referenceNumber: method === 'Cash' ? '' : form.referenceNumber }); setError('') }} required><option>Cash</option><option>GCash</option><option>Maya</option><option>Bank Transfer</option></SelectField>
          {requiresReference && <Field label={`${form.method} reference number`} value={form.referenceNumber} onChange={(referenceNumber) => { setForm({ ...form, referenceNumber }); setError('') }} error={referenceError} helper="Use the transaction or transfer reference from the payment receipt." required />}
        </form>
      </Dialog>

      <Dialog
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title="Payment recorded"
        description="The payment was saved successfully."
        size="sm"
        footer={<Button type="button" onClick={() => setReceipt(null)}>Done</Button>}
      >
        {receipt && <div className="grid gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-success-indicator/25 bg-success-soft px-4 py-3 text-success"><CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /><span className="text-sm font-medium">Receipt reference PAY-{receipt.id.slice(0, 8).toUpperCase()}</span></div>
          <dl className="divide-y divide-border-subtle text-sm">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">Customer</dt><dd className="text-right font-medium text-foreground">{receipt.customer}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">Rental</dt><dd className="font-medium tabular-nums text-foreground">{receipt.rentalId.slice(0, 8)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">Amount received</dt><dd className="font-semibold tabular-nums text-foreground">{peso.format(receipt.amount)}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">Method</dt><dd className="font-medium text-foreground">{receipt.method}</dd></div>
            {receipt.referenceNumber && <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">Payment reference</dt><dd className="text-right font-medium text-foreground">{receipt.referenceNumber}</dd></div>}
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">Remaining balance</dt><dd className="font-semibold tabular-nums text-primary">{peso.format(receipt.newBalance)}</dd></div>
          </dl>
        </div>}
      </Dialog>
    </Page>
  )
}
