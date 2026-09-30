import { DataTable } from '../components/DataTable'
import { Metric } from '../components/Metric'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Workflow } from '../components/Workflow'
import { today } from '../constants'
import { useSummary } from '../hooks/useSummary'
import { customerName, itemLineText } from '../utils/lookups'
import { peso } from '../utils/rental'

export function Dashboard({ state }) {
  const summary = useSummary(state)
  const displayDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(`${today}T00:00:00`))
  const upcoming = state.reservations
    .filter((reservation) => reservation.startDate >= today && reservation.status !== 'Cancelled')
    .slice(0, 5)

  return (
    <Page title="Dashboard" eyebrow="Operations summary" description="A live view of reservations, rentals, inventory, and payments." actions={<span className="inline-flex min-h-8 items-center rounded-full border border-information-indicator/20 bg-information-soft px-3 text-xs font-semibold text-information">Today · {displayDate}</span>}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="flex min-h-40 flex-col justify-between rounded-xl border bg-card p-6 sm:col-span-2">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-muted-foreground">Total rental income</span><span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><WalletCards className="size-5" /></span></div>
          <div className="mt-8"><strong className="block text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">{peso.format(summary.income)}</strong><small className="mt-2 block text-sm text-muted-foreground">{summary.pendingPayments} rentals still have an outstanding balance</small></div>
        </article>
        <Metric label="Today's rentals" value={summary.todayRentals} icon={PackageOpen} />
        <Metric label="Upcoming reservations" value={summary.upcomingReservations} icon={CalendarClock} />
        <Metric label="Currently rented items" value={summary.rentedItems} icon={PackageOpen} />
        <Metric label="Pending returns" value={summary.pendingReturns} tone="warning" icon={ClipboardCheck} />
        <Metric label="Available tables" value={summary.availableByCategory.Table} />
        <Metric label="Available chairs" value={summary.availableByCategory.Chair} />
        <Metric label="Available speakers" value={summary.availableByCategory.Speaker} />
      </section>
      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
        <DataTable
          title="Upcoming reservations"
          columns={['Customer', 'Date', 'Items', 'Status']}
          rows={upcoming.map((reservation) => [
            customerName(state, reservation.customerId),
            reservation.startDate,
            itemLineText(state, reservation.items),
            <StatusBadge key={reservation.id} status={reservation.status} />,
          ])}
        />
        <Workflow />
      </section>
    </Page>
  )
}
import { CalendarClock, ClipboardCheck, PackageOpen, WalletCards } from 'lucide-react'
