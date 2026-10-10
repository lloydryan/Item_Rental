import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { useState } from 'react'

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function maintenanceEvents(state) {
  return (state.inventoryMovements || []).flatMap((movement) => {
    const item = state.items.find((record) => record.id === movement.itemId)
    const startedBy = state.users.find((user) => user.id === movement.createdBy)?.name || 'Staff member'
    const completedBy = state.users.find((user) => user.id === movement.completedBy)?.name || 'Staff member'
    const destination = movement.movementType === 'Repair' ? 'Repair' : 'Maintenance'
    const records = [{
      id: `${movement.id}-out`,
      category: 'out',
      item,
      quantity: movement.quantity,
      route: `Available inventory → ${destination}`,
      detail: 'Stock removed temporarily',
      status: 'Moved out',
      source: startedBy,
      date: movement.createdAt,
      notes: movement.notes,
    }]

    if (movement.status === 'Completed') {
      records.push({
        id: `${movement.id}-in`,
        category: 'return',
        item,
        quantity: movement.quantity,
        route: `${destination} → Available inventory`,
        detail: 'Available quantity restored',
        status: 'Returned to stock',
        source: completedBy,
        date: movement.completedAt,
        notes: movement.notes,
      })
    }
    return records
  })
}

function rentalReleaseEvents(state) {
  const movedOutStatuses = new Set(['Released', 'Active', 'Returned', 'Completed'])
  const reservationsById = new Map(state.reservations.map((reservation) => [reservation.id, reservation]))

  return state.rentals.flatMap((rental) => {
    if (!movedOutStatuses.has(rental.status) || !rental.releaseDate) return []
    const reservation = reservationsById.get(rental.reservationId)
    if (!reservation) return []

    return reservation.items.map((line) => ({
      id: `${rental.id}-${line.id || line.itemId}-release`,
      category: 'out',
      item: state.items.find((record) => record.id === line.itemId),
      quantity: line.quantity,
      route: 'Available inventory → Customer rental',
      detail: `Released under rental ${rental.id.slice(0, 8)}`,
      status: 'Released',
      source: 'Rental workflow',
      date: rental.releaseDate,
      notes: `Reservation ${reservation.id.slice(0, 8)}`,
    }))
  })
}

function rentalReturnEvents(state) {
  return state.returns.flatMap((returnRecord) => returnRecord.items.flatMap((line) => {
    const item = state.items.find((record) => record.id === line.itemId)
    const rentalLabel = `Rental ${returnRecord.rentalId.slice(0, 8)}`

    if (returnRecord.status !== 'Completed') {
      return [{
        id: `${returnRecord.id}-${line.id}-pending`,
        category: 'return',
        item,
        quantity: line.releasedQuantity,
        route: 'Customer rental → Return inspection',
        detail: 'Awaiting inventory inspection',
        status: 'Pending inspection',
        source: 'Rental workflow',
        date: returnRecord.inspectionDate,
        notes: rentalLabel,
      }]
    }

    const returned = Number(line.returnedQuantity || 0)
    const damaged = Number(line.damagedQuantity || 0)
    const available = Math.max(0, returned - damaged)
    const missing = Math.max(0, Number(line.releasedQuantity || 0) - returned)
    const records = []

    if (available > 0) {
      records.push({
        id: `${returnRecord.id}-${line.id}-available`,
        category: 'return',
        item,
        quantity: available,
        route: 'Return inspection → Available inventory',
        detail: 'Available quantity restored',
        status: 'Returned to stock',
        source: 'Return inspection',
        date: returnRecord.inspectionDate,
        notes: returnRecord.notes || rentalLabel,
      })
    }
    if (damaged > 0) {
      records.push({
        id: `${returnRecord.id}-${line.id}-damaged`,
        category: 'issue',
        item,
        quantity: damaged,
        route: 'Return inspection → Damaged inventory',
        detail: 'Held from available stock',
        status: 'Returned damaged',
        source: 'Return inspection',
        date: returnRecord.inspectionDate,
        notes: returnRecord.notes || rentalLabel,
      })
    }
    if (missing > 0) {
      records.push({
        id: `${returnRecord.id}-${line.id}-missing`,
        category: 'issue',
        item,
        quantity: missing,
        route: 'Customer rental → Missing inventory',
        detail: 'Not returned by customer',
        status: 'Missing',
        source: 'Return inspection',
        date: returnRecord.inspectionDate,
        notes: returnRecord.notes || rentalLabel,
      })
    }
    return records
  }))
}

function stockAdjustmentEvents(state) {
  return (state.stockAdjustments || []).map((adjustment) => {
    const item = state.items.find((record) => record.id === adjustment.itemId)
    const staff = state.users.find((user) => user.id === adjustment.createdBy)?.name || 'Staff member'
    if (adjustment.adjustmentType === 'Add') {
      return {
        id: `${adjustment.id}-stock-add`, category: 'return', item, quantity: adjustment.quantity,
        route: 'Stock addition → Available inventory', detail: 'Total and available stock increased',
        status: 'Stock added', source: staff, date: adjustment.createdAt, notes: adjustment.reason,
      }
    }
    if (adjustment.adjustmentType === 'Remove') {
      return {
        id: `${adjustment.id}-stock-remove`, category: 'out', item, quantity: adjustment.quantity,
        route: 'Available inventory → Removed stock', detail: 'Total and available stock reduced',
        status: 'Stock removed', source: staff, date: adjustment.createdAt, notes: adjustment.reason,
      }
    }
    return {
      id: `${adjustment.id}-stock-dispose`, category: 'issue', item, quantity: adjustment.quantity,
      route: 'Unavailable inventory → Disposed',
      detail: `${adjustment.damagedQuantity} damaged · ${adjustment.missingQuantity} missing written off`,
      status: 'Disposed', source: staff, date: adjustment.createdAt, notes: adjustment.reason,
    }
  })
}

export function InventoryMovements({ state }) {
  const [view, setView] = useState('all')
  const events = [
    ...maintenanceEvents(state),
    ...rentalReleaseEvents(state),
    ...rentalReturnEvents(state),
    ...stockAdjustmentEvents(state),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const visibleEvents = events.filter((event) => view === 'all' || event.category === view)
  const rows = visibleEvents.map((event) => [
    <div className="flex min-w-44 items-center gap-3" key={`${event.id}-item`}>
      {event.item?.imageUrl
        ? <img className="size-11 shrink-0 rounded-lg border object-cover" src={event.item.imageUrl} alt="" loading="lazy" />
        : <span className="grid size-11 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">{event.category === 'out' ? <ArrowUpFromLine className="size-5" /> : <ArrowDownToLine className="size-5" />}</span>}
      <strong className="font-semibold text-foreground">{event.item?.name || 'Unknown item'}</strong>
    </div>,
    <div className="min-w-56" key={`${event.id}-route`}><span className="block font-medium text-foreground">{event.route}</span><span className="mt-0.5 block text-xs text-muted-foreground">{event.detail}</span></div>,
    event.quantity,
    <StatusBadge key={`${event.id}-status`} status={event.status} />,
    event.source,
    formatDate(event.date),
    event.notes || '—',
  ])

  return (
    <Page title="Inventory Movements" eyebrow="Stock activity" description="Track maintenance, rental releases, customer returns, and inventory issues in one ledger.">
      <Tabs
        value={view}
        onChange={setView}
        label="Movement filters"
        items={[
          { value: 'all', label: 'All movements', count: events.length },
          { value: 'out', label: 'Stock out', count: events.filter((event) => event.category === 'out').length },
          { value: 'return', label: 'Stock in / returns', count: events.filter((event) => event.category === 'return').length },
          { value: 'issue', label: 'Issues', count: events.filter((event) => event.category === 'issue').length },
        ]}
      />
      <DataTable
        title="Movement ledger"
        description="Each maintenance and rental event is shown separately for a clear stock trail."
        columns={['Item', 'Movement', 'Quantity', 'Status', 'Source', 'Date', 'Notes']}
        rows={rows}
        searchPlaceholder="Search movements…"
      />
    </Page>
  )
}
