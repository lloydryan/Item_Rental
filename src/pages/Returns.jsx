import { useState } from 'react'
import { DataTable } from '../components/DataTable'
import { Page } from '../components/Page'
import { ResponsiveList } from '../components/ResponsiveList'
import { StatusBadge } from '../components/StatusBadge'
import { itemName } from '../utils/lookups'
import { peso, returnDiscrepancy } from '../utils/rental'
import { Alert } from '../components/Feedback'
import { Button } from '../components/Button'
import { Tabs } from '../components/Tabs'

export function Returns({ state, actions }) {
  const [completingId, setCompletingId] = useState('')
  const [error, setError] = useState('')
  const [view, setView] = useState('all')
  const filtered = state.returns.filter((record) => view === 'all' || (view === 'pending' && record.status !== 'Completed') || (view === 'returned' && record.status === 'Completed') || (view === 'damage' && record.items.some((line) => returnDiscrepancy(line).damaged > 0 || returnDiscrepancy(line).missing > 0)))

  async function completeReturn(returnRecord) {
    setCompletingId(returnRecord.id)
    setError('')
    try {
      await actions.completeReturn(returnRecord.id)
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setCompletingId('')
    }
  }

  return (
    <Page title="Returns & damage" eyebrow="Inspection management" description="Track pending inspections, returned quantities, and damaged or missing items.">
      <Alert>{error}</Alert>
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All', count: state.returns.length }, { value: 'pending', label: 'Pending returns' }, { value: 'returned', label: 'Returned' }, { value: 'damage', label: 'With damage' }]} />
      <ResponsiveList
        items={filtered}
        empty="No return records."
        render={(returnRecord) => (
          <article className="grid gap-4 rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-sm font-semibold text-foreground">Rental {returnRecord.rentalId.slice(0, 8)}</strong>
                <span className="mt-1 block text-sm text-gray-500">{returnRecord.inspectionDate} · {returnRecord.notes || 'No inspection notes'}</span>
              </div>
              <StatusBadge status={returnRecord.status} />
            </div>
            <DataTable
              columns={['Item', 'Released', 'Returned', 'Missing', 'Damaged', 'Charges']}
              rows={returnRecord.items.map((line) => {
                const discrepancy = returnDiscrepancy(line)
                return [
                  itemName(state, line.itemId),
                  line.releasedQuantity,
                  line.returnedQuantity,
                  discrepancy.missing,
                  discrepancy.damaged,
                  peso.format(line.additionalCharge),
                ]
              })}
            />
            <Button className="justify-self-start" type="button" loading={completingId === returnRecord.id} onClick={() => completeReturn(returnRecord)} disabled={returnRecord.status === 'Completed'}>Complete inspection</Button>
          </article>
        )}
      />
    </Page>
  )
}
