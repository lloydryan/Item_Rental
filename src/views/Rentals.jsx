import { useState } from 'react'
import { CreditCard, RefreshCw } from 'lucide-react'
import { useNavigate } from '../lib/navigation'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { SelectField } from '../components/Field'
import { ActionMenu, Dialog, MenuItem } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { rentalStatuses, today } from '../constants'
import { customerName, reservationById } from '../utils/lookups'
import { peso, rentalTotal, totalPaid } from '../utils/rental'

export function Rentals({ state, actions }) {
  const navigate = useNavigate()
  const [view, setView] = useState('all')
  const [selected, setSelected] = useState(null)
  const [nextStatus, setNextStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const isOverdue = (rental) => rental.expectedReturnDate < today && !['Returned', 'Completed', 'Cancelled'].includes(rental.status)
  const filtered = state.rentals.filter((rental) => view === 'all' || (view === 'active' && ['Released', 'Active'].includes(rental.status)) || (view === 'due' && rental.expectedReturnDate === today) || (view === 'overdue' && isOverdue(rental)) || (view === 'completed' && rental.status === 'Completed'))

  function openStatus(rental) {
    setSelected(rental)
    setNextStatus(rental.status)
    setError('')
  }

  async function updateStatus() {
    setUpdating(true)
    setError('')
    try {
      await actions.updateRentalStatus(selected.id, nextStatus)
      setSelected(null)
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setUpdating(false)
    }
  }

  const rows = filtered.map((rental) => {
    const reservation = reservationById(state, rental.reservationId)
    const total = rentalTotal(rental)
    const paid = totalPaid(rental.id, state.payments)
    const displayStatus = isOverdue(rental) ? 'Overdue' : rental.status
    return [
      rental.id.slice(0, 8),
      customerName(state, reservation.customerId),
      rental.expectedReturnDate,
      peso.format(total),
      peso.format(Math.max(0, total - paid)),
      <StatusBadge key={rental.id} status={displayStatus} />,
      <ActionMenu key={`${rental.id}-actions`}>
        <MenuItem onClick={() => navigate(`/payments?rental=${rental.id}`)}><CreditCard className="size-4" />Record payment</MenuItem>
        {!['Returned', 'Completed'].includes(rental.status) && <MenuItem onClick={() => openStatus(rental)}><RefreshCw className="size-4" />Change status</MenuItem>}
      </ActionMenu>,
    ]
  })

  return (
    <Page title="Rentals" eyebrow="Rental operations" description="Monitor releases, due dates, balances, and completed transactions.">
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All rentals', count: state.rentals.length }, { value: 'active', label: 'Active' }, { value: 'due', label: 'Due today' }, { value: 'overdue', label: 'Overdue' }, { value: 'completed', label: 'Completed' }]} />
      <DataTable title="Rental transactions" columns={['Rental', 'Customer', 'Expected return', 'Amount', 'Balance', 'Status', 'Actions']} rows={rows} />
      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Change rental status"
        description={selected ? `Rental ${selected.id.slice(0, 8)} · ${customerName(state, reservationById(state, selected.reservationId).customerId)}` : ''}
        size="sm"
        footer={<><Button variant="outline" type="button" onClick={() => setSelected(null)}>Cancel</Button><Button type="button" loading={updating} onClick={updateStatus} disabled={nextStatus === selected?.status}>Update status</Button></>}
      >
        <div className="grid gap-4">
          <Alert>{error}</Alert>
          <SelectField
            label="Status"
            value={nextStatus}
            onChange={setNextStatus}
            helper={nextStatus === 'Returned' ? 'This creates a pending inspection for inventory staff. They will complete the rental after checking the items.' : 'Returned is the final status available to rental staff.'}
          >
            {rentalStatuses.map((status) => <option key={status}>{status}</option>)}
          </SelectField>
        </div>
      </Dialog>
    </Page>
  )
}
