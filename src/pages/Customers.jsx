import { useState } from 'react'
import { Eye, Plus, Users } from 'lucide-react'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { Field } from '../components/Field'
import { ActionMenu, Dialog, MenuItem, Sheet } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { customerRentalCount } from '../utils/lookups'
import { peso, totalPaid } from '../utils/rental'

export function Customers({ state, actions }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', contactNumber: '', email: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  async function save(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Enter the customer’s name.'
    if (!form.contactNumber.trim()) nextErrors.contactNumber = 'Enter a contact number.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setError('')
    try {
      await actions.createCustomer(form)
      setForm({ name: '', contactNumber: '', email: '', address: '' })
      setFieldErrors({})
      setCreateOpen(false)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const customerReservations = selected ? state.reservations.filter((reservation) => reservation.customerId === selected.id) : []
  const customerRentals = state.rentals.filter((rental) => customerReservations.some((reservation) => reservation.id === rental.reservationId))
  const paidTotal = customerRentals.reduce((sum, rental) => sum + totalPaid(rental.id, state.payments), 0)

  return (
    <Page title="Customers" eyebrow="Customer management" description="Manage customer information and review rental activity." actions={<Button type="button" onClick={() => setCreateOpen(true)}><Plus className="size-4" />Add customer</Button>}>
      <div className="grid grid-cols-2 divide-x rounded-xl border bg-card sm:w-fit"><div className="px-5 py-3"><span className="block text-xs font-medium text-muted-foreground">Total customers</span><strong className="mt-1 block text-xl tabular-nums">{state.customers.length}</strong></div><div className="px-5 py-3"><span className="block text-xs font-medium text-muted-foreground">With rentals</span><strong className="mt-1 block text-xl tabular-nums">{state.customers.filter((customer) => customerRentalCount(state, customer.id) > 0).length}</strong></div></div>
      <DataTable
        title="Customer directory"
        columns={['Customer', 'Contact', 'Email', 'Rentals', 'Status', 'Actions']}
        rows={state.customers.map((customer) => [
          <button key={customer.id} className="font-semibold text-gray-900 hover:text-brand-700" type="button" onClick={() => setSelected(customer)}>{customer.name}</button>,
          customer.contactNumber,
          customer.email || '—',
          customerRentalCount(state, customer.id),
          <StatusBadge key={`${customer.id}-status`} status="Active" />,
          <ActionMenu key={`${customer.id}-actions`} label={`Actions for ${customer.name}`}><MenuItem onClick={() => setSelected(customer)}><Eye className="size-4" />View details</MenuItem></ActionMenu>,
        ])}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Add customer" description="Create a customer profile for reservations and rental history." footer={<><Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" form="customer-form" loading={saving}><Plus className="size-4" />Add customer</Button></>}>
        <form id="customer-form" className="grid gap-4" onSubmit={save}>
          <Alert>{error}</Alert>
          <Field label="Full name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={fieldErrors.name} required />
          <Field label="Contact number" value={form.contactNumber} onChange={(contactNumber) => setForm({ ...form, contactNumber })} error={fieldErrors.contactNumber} required />
          <Field label="Email address" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          <Field label="Address" value={form.address} onChange={(address) => setForm({ ...form, address })} />
        </form>
      </Dialog>

      <Sheet open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || 'Customer details'} description="Customer overview and rental activity">
        {selected && <div className="grid gap-6"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-full bg-brand-50 font-bold text-brand-700"><Users className="size-5" /></span><div><StatusBadge status="Active" /><p className="mt-2 text-sm text-gray-600">{selected.contactNumber}</p><p className="text-sm text-gray-500">{selected.email || 'No email provided'}</p></div></div><section className="grid grid-cols-3 divide-x rounded-xl border bg-gray-50 text-center"><div className="p-3"><strong className="block text-lg tabular-nums">{customerReservations.length}</strong><span className="text-xs text-gray-500">Reservations</span></div><div className="p-3"><strong className="block text-lg tabular-nums">{customerRentals.length}</strong><span className="text-xs text-gray-500">Rentals</span></div><div className="p-3"><strong className="block text-sm tabular-nums">{peso.format(paidTotal)}</strong><span className="text-xs text-gray-500">Paid</span></div></section><section><h3 className="text-sm font-semibold text-gray-950">Contact information</h3><dl className="mt-3 divide-y border-y text-sm"><div className="grid grid-cols-[7rem_1fr] gap-3 py-3"><dt className="text-gray-500">Address</dt><dd className="text-gray-900">{selected.address || 'Not provided'}</dd></div><div className="grid grid-cols-[7rem_1fr] gap-3 py-3"><dt className="text-gray-500">Created</dt><dd className="text-gray-900">{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString('en-PH') : '—'}</dd></div></dl></section><section><h3 className="text-sm font-semibold text-gray-950">Recent reservations</h3><div className="mt-3 divide-y border-y">{customerReservations.slice(0, 5).map((reservation) => <div className="flex items-center justify-between gap-3 py-3 text-sm" key={reservation.id}><div><strong className="font-medium text-gray-900">{reservation.startDate}</strong><span className="block text-gray-500">{reservation.eventLocation}</span></div><StatusBadge status={reservation.status} /></div>)}{!customerReservations.length && <p className="py-5 text-sm text-gray-500">No reservation history yet.</p>}</div></section></div>}
      </Sheet>
    </Page>
  )
}
