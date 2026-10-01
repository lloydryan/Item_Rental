import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../components/Button'
import { Alert, EmptyState } from '../components/Feedback'
import { SelectField } from '../components/Field'
import { ActionMenu, Dialog, MenuItem } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { deliveryStatuses, today } from '../constants'
import { customerName, itemLineText, reservationById } from '../utils/lookups'

export function Deliveries({ state, actions, currentUser }) {
  const [view, setView] = useState('all')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ deliveryStatus: '', pickupStatus: '' })
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const available = currentUser.role === 'delivery' ? state.deliveries.filter((delivery) => delivery.assignedUserId === currentUser.id) : state.deliveries
  const filtered = available.filter((delivery) => view === 'all' || (view === 'today' && (delivery.deliveryDateTime.startsWith(today) || delivery.pickupSchedule.startsWith(today))) || (view === 'upcoming' && delivery.deliveryDateTime.slice(0, 10) > today && delivery.deliveryStatus !== 'Completed') || (view === 'completed' && delivery.deliveryStatus === 'Completed'))

  function openUpdate(delivery) { setSelected(delivery); setForm({ deliveryStatus: delivery.deliveryStatus, pickupStatus: delivery.pickupStatus }); setError('') }
  async function update() {
    setUpdating(true); setError('')
    try { await actions.updateDelivery(selected.id, form); setSelected(null) } catch (updateError) { setError(updateError.message) } finally { setUpdating(false) }
  }

  return (
    <Page title="Delivery & pickup" eyebrow="Field operations" description="Coordinate schedules and track delivery and pickup progress.">
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All', count: available.length }, { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'completed', label: 'Completed' }]} />
      <div className="grid gap-3">{filtered.map((delivery) => { const rental = state.rentals.find((record) => record.id === delivery.rentalId); const reservation = rental ? reservationById(state, rental.reservationId) : null; return <article className="grid gap-4 border-b bg-card px-4 py-5 shadow-xs first:rounded-t-xl first:border-t first:border-x last:rounded-b-xl last:border-x lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] lg:items-center" key={delivery.id}><div className="min-w-0"><strong className="block text-sm font-semibold text-foreground">{reservation ? customerName(state, reservation.customerId) : 'Unknown customer'}</strong><span className="mt-1 block text-sm text-muted-foreground">{delivery.address}</span><small className="mt-1 block truncate text-xs text-muted-foreground">{reservation ? itemLineText(state, reservation.items) : 'Rental details unavailable'}</small></div><div><span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivery</span><span className="mt-1 block text-sm text-foreground">{delivery.deliveryDateTime ? new Date(delivery.deliveryDateTime).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'}</span><span className="mt-2 block"><StatusBadge status={delivery.deliveryStatus} /></span></div><div><span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Pickup</span><span className="mt-1 block text-sm text-foreground">{delivery.pickupSchedule ? new Date(delivery.pickupSchedule).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'}</span><span className="mt-2 block"><StatusBadge status={delivery.pickupStatus} /></span></div><ActionMenu label="Delivery actions"><MenuItem onClick={() => openUpdate(delivery)}><RefreshCw className="size-4" />Update status</MenuItem></ActionMenu></article> })}{!filtered.length && <EmptyState title="No delivery records in this view" description="Try another operational view." />}</div>
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title="Update delivery status" description="Record the latest delivery and pickup progress." size="sm" footer={<><Button variant="outline" type="button" onClick={() => setSelected(null)}>Cancel</Button><Button type="button" loading={updating} onClick={update}>Save changes</Button></>}><div className="grid gap-4"><Alert>{error}</Alert><SelectField label="Delivery status" value={form.deliveryStatus} onChange={(deliveryStatus) => setForm({ ...form, deliveryStatus })}>{deliveryStatuses.map((status) => <option key={status}>{status}</option>)}</SelectField><SelectField label="Pickup status" value={form.pickupStatus} onChange={(pickupStatus) => setForm({ ...form, pickupStatus })}>{deliveryStatuses.map((status) => <option key={status}>{status}</option>)}</SelectField></div></Dialog>
    </Page>
  )
}
