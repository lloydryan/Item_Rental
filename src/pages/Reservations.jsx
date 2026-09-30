import { useState } from 'react'
import { Eye, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { ActionMenu, MenuItem, Sheet } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { customerName, itemLineText } from '../utils/lookups'
import { peso, reservationTotal } from '../utils/rental'

export function Reservations({ state }) {
  const [view, setView] = useState('all')
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()
  const filtered = state.reservations.filter((reservation) => view === 'all' || (view === 'upcoming' && reservation.startDate >= new Date().toISOString().slice(0, 10) && reservation.status !== 'Cancelled') || reservation.status.toLowerCase() === view)

  return (
    <Page title="Reservations" eyebrow="Booking management" description="Review upcoming and historical customer reservations." actions={<Button type="button" onClick={() => navigate('/reservations/new')}><Plus className="size-4" />New reservation</Button>}>
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All', count: state.reservations.length }, { value: 'upcoming', label: 'Upcoming' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      <DataTable title="Reservation records" columns={['Reservation', 'Customer', 'Rental period', 'Items', 'Total', 'Status', 'Actions']} rows={filtered.map((reservation) => [reservation.id.slice(0, 8), customerName(state, reservation.customerId), `${reservation.startDate} – ${reservation.endDate}`, itemLineText(state, reservation.items), peso.format(reservationTotal(reservation, state.items)), <StatusBadge key={reservation.id} status={reservation.status} />, <ActionMenu key={`${reservation.id}-actions`}><MenuItem onClick={() => setSelected(reservation)}><Eye className="size-4" />View details</MenuItem></ActionMenu>])} />
      <Sheet open={Boolean(selected)} onClose={() => setSelected(null)} title="Reservation details" description={selected ? `Reservation ${selected.id.slice(0, 8)}` : ''}>
        {selected && <div className="grid gap-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-gray-950">{customerName(state, selected.customerId)}</p><p className="mt-1 text-sm text-gray-500">{selected.eventLocation}</p></div><StatusBadge status={selected.status} /></div><dl className="divide-y border-y text-sm"><div className="grid grid-cols-[8rem_1fr] gap-3 py-3"><dt className="text-gray-500">Rental period</dt><dd>{selected.startDate} – {selected.endDate}</dd></div><div className="grid grid-cols-[8rem_1fr] gap-3 py-3"><dt className="text-gray-500">Delivery</dt><dd>{selected.deliveryRequired ? 'Required' : 'Customer pickup'}</dd></div><div className="grid grid-cols-[8rem_1fr] gap-3 py-3"><dt className="text-gray-500">Total</dt><dd className="font-semibold tabular-nums">{peso.format(reservationTotal(selected, state.items))}</dd></div></dl><section><h3 className="text-sm font-semibold text-gray-950">Rental items</h3><div className="mt-3 divide-y border-y">{selected.items.map((line) => <div className="flex justify-between gap-4 py-3 text-sm" key={line.id || line.itemId}><span>{state.items.find((item) => item.id === line.itemId)?.name || 'Item'}</span><span className="tabular-nums text-gray-500">{line.quantity} × {peso.format(line.unitPrice)}</span></div>)}</div></section></div>}
      </Sheet>
    </Page>
  )
}
