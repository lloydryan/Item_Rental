import { useState } from 'react'
import { Alert } from '../components/Feedback'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Field, TextareaField } from '../components/Field'
import { Dialog } from '../components/Overlay'
import { Page } from '../components/Page'
import { ResponsiveList } from '../components/ResponsiveList'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { itemName } from '../utils/lookups'
import { peso, returnDiscrepancy } from '../utils/rental'

function inspectionFromRecord(record) {
  return {
    notes: record.notes,
    items: record.items.map((line) => ({
      ...line,
      returnedQuantity: String(line.returnedQuantity),
      damagedQuantity: String(line.damagedQuantity),
      additionalCharge: String(line.additionalCharge),
    })),
  }
}

function validateInspection(inspection) {
  for (const line of inspection.items) {
    const returned = Number(line.returnedQuantity)
    const damaged = Number(line.damagedQuantity)
    const charge = Number(line.additionalCharge)
    if (!Number.isInteger(returned) || returned < 0 || returned > line.releasedQuantity) return 'Returned quantity must be a whole number between zero and the released quantity.'
    if (!Number.isInteger(damaged) || damaged < 0 || damaged > returned) return 'Damaged quantity must be a whole number and cannot exceed the returned quantity.'
    if (!Number.isFinite(charge) || charge < 0) return 'Additional charges cannot be negative.'
  }
  return ''
}

export function Returns({ state, actions }) {
  const [selected, setSelected] = useState(null)
  const [inspection, setInspection] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('all')
  const filtered = state.returns.filter((record) => view === 'all' || (view === 'pending' && record.status !== 'Completed') || (view === 'returned' && record.status === 'Completed') || (view === 'damage' && record.items.some((line) => returnDiscrepancy(line).damaged > 0 || returnDiscrepancy(line).missing > 0)))

  function openInspection(record) {
    setSelected(record)
    setInspection(inspectionFromRecord(record))
    setError('')
  }

  function closeInspection() {
    if (completing) return
    setSelected(null)
    setInspection(null)
    setError('')
  }

  function updateLine(id, field, value) {
    setInspection((current) => ({
      ...current,
      items: current.items.map((line) => line.id === id ? { ...line, [field]: value } : line),
    }))
  }

  async function completeReturn() {
    const validationError = validateInspection(inspection)
    if (validationError) {
      setError(validationError)
      return
    }
    setCompleting(true)
    setError('')
    try {
      await actions.completeReturn(selected.id, inspection)
      setSelected(null)
      setInspection(null)
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <Page title="Returns & damage" eyebrow="Inspection management" description="Inspect returned items, record damage or missing quantities, and close rental transactions.">
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All', count: state.returns.length }, { value: 'pending', label: 'Pending returns' }, { value: 'returned', label: 'Completed' }, { value: 'damage', label: 'With damage' }]} />
      <ResponsiveList
        items={filtered}
        empty="No return records. Rentals appear here after rental staff mark them as Returned."
        render={(returnRecord) => (
          <article className="grid gap-4 rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-sm font-semibold text-foreground">Rental {returnRecord.rentalId.slice(0, 8)}</strong>
                <span className="mt-1 block text-sm text-muted-foreground">{returnRecord.inspectionDate} · {returnRecord.notes || 'No inspection notes'}</span>
              </div>
              <StatusBadge status={returnRecord.status} />
            </div>
            <DataTable
              embedded
              columns={['Item', 'Released', 'Returned', 'Missing', 'Damaged', 'Charges']}
              rows={returnRecord.items.map((line) => {
                const discrepancy = returnDiscrepancy(line)
                return [itemName(state, line.itemId), line.releasedQuantity, line.returnedQuantity, discrepancy.missing, discrepancy.damaged, peso.format(line.additionalCharge)]
              })}
            />
            {returnRecord.status !== 'Completed' && <Button className="justify-self-start" type="button" onClick={() => openInspection(returnRecord)}>Inspect and complete</Button>}
          </article>
        )}
      />
      <Dialog
        open={Boolean(selected && inspection)}
        onClose={closeInspection}
        title="Complete return inspection"
        description={selected ? `Rental ${selected.rentalId.slice(0, 8)} · Confirm every quantity before completing.` : ''}
        size="lg"
        footer={<><Button variant="outline" type="button" onClick={closeInspection} disabled={completing}>Cancel</Button><Button type="button" loading={completing} onClick={completeReturn}>Complete inspection</Button></>}
      >
        {inspection && <div className="grid gap-5">
          <Alert>{error}</Alert>
          <div className="grid gap-3">
            {inspection.items.map((line) => {
              const returned = Number(line.returnedQuantity || 0)
              const missing = Math.max(0, line.releasedQuantity - returned)
              return (
                <section className="grid gap-3 rounded-lg border border-border-subtle bg-secondary/40 p-4" key={line.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div><strong className="text-sm font-semibold text-foreground">{itemName(state, line.itemId)}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{line.releasedQuantity} released</span></div>
                    <span className="text-xs font-medium text-muted-foreground">{missing} missing</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Returned" type="number" min="0" max={line.releasedQuantity} step="1" value={line.returnedQuantity} onChange={(value) => updateLine(line.id, 'returnedQuantity', value)} />
                    <Field label="Damaged" type="number" min="0" max={Math.max(0, returned)} step="1" value={line.damagedQuantity} onChange={(value) => updateLine(line.id, 'damagedQuantity', value)} />
                    <Field label="Additional charge" type="number" min="0" step="0.01" value={line.additionalCharge} onChange={(value) => updateLine(line.id, 'additionalCharge', value)} />
                  </div>
                </section>
              )
            })}
          </div>
          <TextareaField label="Inspection notes" value={inspection.notes} onChange={(value) => setInspection((current) => ({ ...current, notes: value }))} helper="Describe any damage, missing items, or other findings." />
          <p className="text-xs leading-5 text-muted-foreground">Completing the inspection updates unavailable inventory, adds any charges to the rental, and changes the rental status to Completed.</p>
        </div>}
      </Dialog>
    </Page>
  )
}
