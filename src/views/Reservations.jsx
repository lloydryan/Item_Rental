import { useState } from 'react'
import { CheckCircle2, Eye, PackageCheck, Plus, XCircle } from 'lucide-react'
import { useNavigate } from '../lib/navigation'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { ActionMenu, Dialog, MenuItem, Sheet } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { customerName, itemLineText } from '../utils/lookups'
import { peso, reservationTotal } from '../utils/rental'

export function Reservations({ state, actions }) {
  const [view, setView] = useState('all')
  const [selected, setSelected] = useState(null)
  const [converting, setConverting] = useState(null)
  const [statusChange, setStatusChange] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const rentalByReservation = new Map(state.rentals.map((rental) => [rental.reservationId, rental]))
  const reservationsWithoutRentals = state.reservations.filter((reservation) => !rentalByReservation.has(reservation.id))
  const filtered = reservationsWithoutRentals.filter((reservation) => view === 'all' || (view === 'upcoming' && reservation.startDate >= new Date().toISOString().slice(0, 10) && reservation.status !== 'Cancelled') || reservation.status.toLowerCase() === view)

  function openCreateRental(reservation) {
    setSelected(null)
    setConverting(reservation)
    setError('')
  }

  function openStatusChange(reservation, status) {
    setSelected(null)
    setStatusChange({ reservation, status })
    setError('')
  }

  async function createRental() {
    setSaving(true)
    setError('')
    try {
      await actions.createRentalFromReservation(converting.id)
      setConverting(null)
      navigate('/rentals')
    } catch (createError) {
      setError(createError.message)
    } finally {
      setSaving(false)
    }
  }

  async function changeReservationStatus() {
    setSaving(true)
    setError('')
    try {
      await actions.updateReservationStatus(statusChange.reservation.id, statusChange.status)
      setStatusChange(null)
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page title="Reservations" eyebrow="Booking management" description="Review reservations that have not yet been opened as rentals." actions={<Button type="button" onClick={() => navigate('/reservations/new')}><Plus className="size-4" />New reservation</Button>}>
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All', count: reservationsWithoutRentals.length }, { value: 'draft', label: 'Draft' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <DataTable title="Reservation records" columns={['Reservation', 'Customer', 'Rental period', 'Items', 'Total', 'Status', 'Actions']} rows={filtered.map((reservation) => { const rental = rentalByReservation.get(reservation.id); return [reservation.id.slice(0, 8), customerName(state, reservation.customerId), `${reservation.startDate} – ${reservation.endDate}`, itemLineText(state, reservation.items), peso.format(reservationTotal(reservation, state.items)), <StatusBadge key={reservation.id} status={reservation.status} />, <ActionMenu key={`${reservation.id}-actions`}><MenuItem onClick={() => setSelected(reservation)}><Eye className="size-4" />View details</MenuItem>{rental ? <MenuItem onClick={() => navigate('/rentals')}><PackageCheck className="size-4" />Open rental</MenuItem> : <>{reservation.status === 'Draft' && <MenuItem onClick={() => openStatusChange(reservation, 'Confirmed')}><CheckCircle2 className="size-4" />Confirm reservation</MenuItem>}{reservation.status === 'Confirmed' && <MenuItem onClick={() => openCreateRental(reservation)}><PackageCheck className="size-4" />Create rental</MenuItem>}{['Draft', 'Confirmed'].includes(reservation.status) && <MenuItem tone="danger" onClick={() => openStatusChange(reservation, 'Cancelled')}><XCircle className="size-4" />Cancel reservation</MenuItem>}</>}</ActionMenu>] })} />
      <Sheet open={Boolean(selected)} onClose={() => setSelected(null)} title="Reservation details" description={selected ? `Reservation ${selected.id.slice(0, 8)}` : ''} footer={selected && (rentalByReservation.has(selected.id) ? <Button type="button" onClick={() => navigate('/rentals')}><PackageCheck className="size-4" />Open rental</Button> : <>{['Draft', 'Confirmed'].includes(selected.status) && <Button variant="outline" type="button" onClick={() => openStatusChange(selected, 'Cancelled')}><XCircle className="size-4" />Cancel reservation</Button>}{selected.status === 'Draft' && <Button type="button" onClick={() => openStatusChange(selected, 'Confirmed')}><CheckCircle2 className="size-4" />Confirm reservation</Button>}{selected.status === 'Confirmed' && <Button type="button" onClick={() => openCreateRental(selected)}><PackageCheck className="size-4" />Create rental</Button>}</>)}>
        {selected && <div className="grid gap-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-foreground">{customerName(state, selected.customerId)}</p><p className="mt-1 text-sm text-muted-foreground">{selected.eventLocation}</p></div><StatusBadge status={selected.status} /></div><dl className="divide-y divide-border-subtle border-y text-sm"><div className="grid grid-cols-[8rem_1fr] gap-3 py-3"><dt className="text-muted-foreground">Rental period</dt><dd>{selected.startDate} – {selected.endDate}</dd></div><div className="grid grid-cols-[8rem_1fr] gap-3 py-3"><dt className="text-muted-foreground">Delivery</dt><dd>{selected.deliveryRequired ? 'Required' : 'Customer pickup'}</dd></div><div className="grid grid-cols-[8rem_1fr] gap-3 py-3"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold tabular-nums">{peso.format(reservationTotal(selected, state.items))}</dd></div></dl><section><h3 className="text-sm font-semibold text-foreground">Rental items</h3><div className="mt-3 divide-y divide-border-subtle border-y">{selected.items.map((line) => <div className="flex justify-between gap-4 py-3 text-sm" key={line.id || line.itemId}><span>{state.items.find((item) => item.id === line.itemId)?.name || 'Item'}</span><span className="tabular-nums text-muted-foreground">{line.quantity} × {peso.format(line.unitPrice)}</span></div>)}</div></section></div>}
      </Sheet>
      <Dialog open={Boolean(converting)} onClose={() => { if (!saving) setConverting(null) }} title="Create rental transaction" description={converting ? `Reservation ${converting.id.slice(0, 8)} · ${customerName(state, converting.customerId)}` : ''} size="sm" footer={<><Button variant="outline" type="button" onClick={() => setConverting(null)} disabled={saving}>Cancel</Button><Button type="button" loading={saving} onClick={createRental}><PackageCheck className="size-4" />Create rental</Button></>}>
        <div className="grid gap-4">
          <Alert>{error}</Alert>
          <p className="text-sm leading-6 text-muted-foreground">This creates the rental transaction, carries over the reservation total and expected return date, and makes it available on the Payments page.</p>
          {converting && <dl className="divide-y divide-border-subtle border-y text-sm"><div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Expected return</dt><dd>{converting.endDate}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Rental total</dt><dd className="font-semibold tabular-nums">{peso.format(reservationTotal(converting, state.items))}</dd></div></dl>}
        </div>
      </Dialog>
      <Dialog open={Boolean(statusChange)} onClose={() => { if (!saving) setStatusChange(null) }} title={statusChange?.status === 'Cancelled' ? 'Cancel reservation' : 'Confirm reservation'} description={statusChange ? `Reservation ${statusChange.reservation.id.slice(0, 8)} · ${customerName(state, statusChange.reservation.customerId)}` : ''} size="sm" footer={<><Button variant="outline" type="button" onClick={() => setStatusChange(null)} disabled={saving}>Go back</Button><Button variant={statusChange?.status === 'Cancelled' ? 'destructive' : 'primary'} type="button" loading={saving} onClick={changeReservationStatus}>{statusChange?.status === 'Cancelled' ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}{statusChange?.status === 'Cancelled' ? 'Cancel reservation' : 'Confirm reservation'}</Button></>}>
        <div className="grid gap-4"><Alert>{error}</Alert><p className="text-sm leading-6 text-muted-foreground">{statusChange?.status === 'Cancelled' ? 'This releases the reserved inventory for the selected dates. Cancellation is allowed only before a rental transaction has been created.' : 'Confirm this reservation after the client agrees to the booking. It can still be cancelled until a rental transaction is created.'}</p></div>
      </Dialog>
    </Page>
  )
}
