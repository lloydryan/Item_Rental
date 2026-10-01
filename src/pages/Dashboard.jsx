import { AlertTriangle, CalendarClock, ClipboardCheck, PackageOpen, WalletCards } from 'lucide-react'
import { ContentCard } from '../components/Card'
import { DataTable } from '../components/DataTable'
import { Metric } from '../components/Metric'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { today } from '../constants'
import { useSummary } from '../hooks/useSummary'
import { customerName, itemLineText } from '../utils/lookups'
import { getUnavailableQuantity, peso } from '../utils/rental'

export function Dashboard({ state }) {
  const summary = useSummary(state)
  const displayDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(`${today}T00:00:00`))
  const upcoming = state.reservations
    .filter((reservation) => reservation.startDate >= today && reservation.status !== 'Cancelled')
    .slice(0, 6)
  const damagedUnits = state.items.reduce((sum, item) => sum + getUnavailableQuantity(item), 0)
  const overdueReturns = state.rentals.filter((rental) => rental.expectedReturnDate < today && !['Returned', 'Completed', 'Cancelled'].includes(rental.status)).length
  const availability = Object.entries(summary.availableByCategory).filter(([, quantity]) => quantity > 0).slice(0, 5)

  return (
    <Page title="Dashboard" eyebrow="Operations summary" description="A live view of reservations, rentals, inventory, and payments." actions={<span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-information-indicator/20 bg-information-soft px-3 text-xs font-medium text-information"><span className="size-1.5 rounded-full bg-information-indicator" />Today · {displayDate}</span>}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key performance indicators">
        <div className="sm:col-span-2"><Metric featured label="Total rental income" value={peso.format(summary.income)} helper={`${summary.pendingPayments} ${summary.pendingPayments === 1 ? 'rental has' : 'rentals have'} an outstanding balance`} icon={WalletCards} /></div>
        <Metric label="Today's rentals" value={summary.todayRentals} helper="Scheduled for release today" icon={PackageOpen} />
        <Metric label="Upcoming reservations" value={summary.upcomingReservations} helper="Confirmed and future bookings" icon={CalendarClock} />
        <Metric label="Currently committed" value={summary.rentedItems} helper="Units reserved or released" icon={PackageOpen} />
        <Metric label="Pending returns" value={summary.pendingReturns} tone={summary.pendingReturns ? 'warning' : undefined} helper="Open rental transactions" icon={ClipboardCheck} />
        <Metric label="Overdue returns" value={overdueReturns} tone={overdueReturns ? 'warning' : undefined} helper="Past expected return date" icon={AlertTriangle} />
        <Metric label="Unavailable units" value={damagedUnits} tone={damagedUnits ? 'warning' : undefined} helper="Damaged or missing inventory" icon={AlertTriangle} />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.5fr)]">
        <DataTable title="Upcoming reservations" description="The next confirmed bookings requiring attention." columns={['Customer', 'Date', 'Items', 'Status']} rows={upcoming.map((reservation) => [customerName(state, reservation.customerId), reservation.startDate, itemLineText(state, reservation.items), <StatusBadge key={reservation.id} status={reservation.status} />])} />
        <ContentCard title="Available today" description="Usable stock after current commitments.">
          <dl className="divide-y divide-border-subtle px-5">
            {availability.map(([category, quantity]) => <div className="flex items-center justify-between gap-4 py-3.5" key={category}><dt className="text-sm text-muted-foreground">{category}</dt><dd className="text-base font-semibold tabular-nums text-foreground">{quantity}</dd></div>)}
            {!availability.length && <p className="py-8 text-center text-sm text-muted-foreground">No available inventory today.</p>}
          </dl>
        </ContentCard>
      </section>
    </Page>
  )
}
