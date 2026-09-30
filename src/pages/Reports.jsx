import { CalendarDays, PackageCheck, Percent, WalletCards } from 'lucide-react'
import { DataTable } from '../components/DataTable'
import { Metric } from '../components/Metric'
import { Page } from '../components/Page'
import { today } from '../constants'
import { customerName, itemName, reservationById } from '../utils/lookups'
import { getAvailableQuantity, getUnavailableQuantity, peso } from '../utils/rental'

export function Reports({ state }) {
  const income = state.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalUsable = state.items.reduce((sum, item) => sum + Number(item.totalQuantity) - getUnavailableQuantity(item), 0)
  const totalAvailable = state.items.reduce((sum, item) => sum + getAvailableQuantity(item, today, today, state.reservations), 0)
  const utilization = totalUsable ? Math.round(((totalUsable - totalAvailable) / totalUsable) * 100) : 0
  const dailyRevenue = Object.entries(state.payments.reduce((groups, payment) => ({ ...groups, [payment.paymentDate]: (groups[payment.paymentDate] || 0) + Number(payment.amount) }), {})).sort(([a], [b]) => a.localeCompare(b)).slice(-8)
  const maxRevenue = Math.max(1, ...dailyRevenue.map(([, amount]) => amount))
  const itemTotals = Object.entries(state.reservations.flatMap((reservation) => reservation.items).reduce((totals, line) => ({ ...totals, [line.itemId]: (totals[line.itemId] || 0) + Number(line.quantity) }), {})).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <Page title="Reports" eyebrow="Business performance" description="Analyze real rental activity, revenue, and inventory utilization.">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Revenue recorded" value={peso.format(income)} icon={WalletCards} /><Metric label="Rental transactions" value={state.rentals.length} icon={PackageCheck} /><Metric label="Reservations" value={state.reservations.length} icon={CalendarDays} /><Metric label="Current utilization" value={`${utilization}%`} icon={Percent} /></section>
      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <div className="rounded-xl border bg-card p-5"><div><h2 className="text-base font-semibold text-foreground">Revenue activity</h2><p className="mt-1 text-sm text-muted-foreground">Recorded payments grouped by transaction date.</p></div>{dailyRevenue.length ? <div className="mt-8 flex h-56 items-end gap-3 border-b border-l px-3 pb-0" role="img" aria-label="Revenue by payment date">{dailyRevenue.map(([date, amount]) => <div className="flex h-full min-w-0 flex-1 flex-col justify-end" key={date}><span className="mb-2 truncate text-center text-xs font-medium tabular-nums text-muted-foreground">{peso.format(amount)}</span><div className="min-h-1 rounded-t-md bg-primary" style={{ height: `${Math.max(4, (amount / maxRevenue) * 75)}%` }} /><span className="mt-2 truncate text-center text-[10px] text-muted-foreground">{new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span></div>)}</div> : <p className="mt-6 rounded-lg bg-secondary px-4 py-10 text-center text-sm text-muted-foreground">Revenue activity will appear after payments are recorded.</p>}</div>
        <div className="rounded-xl border bg-card p-5"><h2 className="text-base font-semibold text-foreground">Inventory position</h2><p className="mt-1 text-sm text-muted-foreground">Availability across all usable stock today.</p><div className="mt-8"><div className="flex items-end justify-between"><strong className="text-4xl tabular-nums text-foreground">{utilization}%</strong><span className="text-sm text-muted-foreground">utilized</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, utilization)}%` }} /></div><dl className="mt-6 divide-y text-sm"><div className="flex justify-between py-3"><dt className="text-muted-foreground">Usable units</dt><dd className="font-medium tabular-nums">{totalUsable}</dd></div><div className="flex justify-between py-3"><dt className="text-muted-foreground">Available today</dt><dd className="font-medium tabular-nums">{totalAvailable}</dd></div><div className="flex justify-between py-3"><dt className="text-muted-foreground">Unavailable stock</dt><dd className="font-medium tabular-nums">{state.items.reduce((sum, item) => sum + getUnavailableQuantity(item), 0)}</dd></div></dl></div></div>
      </section>
      <section className="grid items-start gap-6 xl:grid-cols-2"><DataTable title="Popular items" columns={['Item', 'Reserved quantity']} rows={itemTotals.map(([id, quantity]) => [itemName(state, id), quantity])} /><DataTable title="Recent payments" columns={['Date', 'Customer', 'Reference', 'Amount', 'Method']} rows={state.payments.slice(0, 10).map((payment) => { const rental = state.rentals.find((record) => record.id === payment.rentalId); const reservation = rental ? reservationById(state, rental.reservationId) : null; return [payment.paymentDate, reservation ? customerName(state, reservation.customerId) : 'Unknown customer', payment.referenceNumber || '—', peso.format(payment.amount), payment.method] })} /></section>
    </Page>
  )
}
