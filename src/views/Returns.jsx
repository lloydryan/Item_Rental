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
    if (line.returnedQuantity === '' || !Number.isInteger(returned) || returned < 0 || returned > line.releasedQuantity) return 'Returned quantity must be a whole number between zero and the released quantity.'
    if (line.damagedQuantity === '' || !Number.isInteger(damaged) || damaged < 0 || damaged > returned) return 'Damaged quantity must be a whole number and cannot exceed the returned quantity.'
    if (line.additionalCharge === '' || !Number.isFinite(charge) || charge < 0) return 'Enter an additional charge of zero or more.'
  }
  return ''
}

function inspectionQuantity(line) {
  const released = Number(line.releasedQuantity || 0)
  const returnedValue = Number(line.returnedQuantity)
  const damagedValue = Number(line.damagedQuantity)
  const returned = Number.isFinite(returnedValue) ? returnedValue : 0
  const damaged = Number.isFinite(damagedValue) ? damagedValue : 0

  return {
    released,
    returned,
    damaged,
    usable: Math.max(0, returned - damaged),
    missing: Math.max(0, released - returned),
  }
}

function lineErrors(line) {
  const returned = Number(line.returnedQuantity)
  const damaged = Number(line.damagedQuantity)
  return {
    returned: line.returnedQuantity === '' || !Number.isInteger(returned) || returned < 0 || returned > line.releasedQuantity
      ? `Enter a whole number from 0 to ${line.releasedQuantity}.`
      : '',
    damaged: line.damagedQuantity === '' || !Number.isInteger(damaged) || damaged < 0 || damaged > returned
      ? `Enter a whole number from 0 to ${Number.isInteger(returned) && returned >= 0 ? returned : 0}.`
      : '',
    charge: line.additionalCharge === '' || !Number.isFinite(Number(line.additionalCharge)) || Number(line.additionalCharge) < 0
      ? 'Enter an amount of zero or more.'
      : '',
  }
}

export function Returns({ state, actions }) {
  const [selected, setSelected] = useState(null)
  const [inspection, setInspection] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState('all')
  const filtered = state.returns.filter((record) => view === 'all' || (view === 'pending' && record.status !== 'Completed') || (view === 'returned' && record.status === 'Completed') || (view === 'damage' && record.items.some((line) => returnDiscrepancy(line).damaged > 0 || returnDiscrepancy(line).missing > 0)))
  const inspectionSummary = inspection?.items.reduce((summary, line) => {
    const quantities = inspectionQuantity(line)
    return {
      released: summary.released + quantities.released,
      returned: summary.returned + quantities.returned,
      usable: summary.usable + quantities.usable,
      damaged: summary.damaged + quantities.damaged,
      missing: summary.missing + quantities.missing,
      charges: summary.charges + (Number(line.additionalCharge) || 0),
    }
  }, { released: 0, returned: 0, usable: 0, damaged: 0, missing: 0, charges: 0 })
  const hasInspectionErrors = inspection ? Boolean(validateInspection(inspection)) : true

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
        size="xl"
        footer={inspectionSummary && <div className="grid w-full gap-3">
          <div aria-label="Inspection totals">
            <div className="mb-2 flex items-center justify-between gap-3">
              <strong className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspection summary</strong>
              <span className="text-xs text-muted-foreground">{inspection.items.length} {inspection.items.length === 1 ? 'item type' : 'item types'}</span>
            </div>
            <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-6">
              {[
                ['Released', inspectionSummary.released],
                ['Returned', inspectionSummary.returned],
                ['Usable', inspectionSummary.usable],
                ['Damaged', inspectionSummary.damaged],
                ['Missing', inspectionSummary.missing],
                ['Charges', peso.format(inspectionSummary.charges)],
              ].map(([label, value]) => (
                <div className="bg-card px-3 py-2" key={label}>
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${label === 'Missing' && value > 0 ? 'text-destructive' : 'text-foreground'}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" type="button" onClick={closeInspection} disabled={completing}>Cancel</Button>
            <Button type="button" loading={completing} disabled={hasInspectionErrors} onClick={completeReturn}>Complete inspection</Button>
          </div>
        </div>}
      >
        {inspection && <div className="grid gap-4">
          <Alert>{error}</Alert>
          <div className="grid gap-3">
            {inspection.items.map((line) => {
              const quantities = inspectionQuantity(line)
              const fieldErrors = lineErrors(line)
              return (
                <section className="grid gap-3 rounded-lg border border-border-subtle bg-secondary/40 p-4" key={line.id} aria-label={`${itemName(state, line.itemId)} return quantities`}>
                  <div className="flex items-start justify-between gap-4">
                    <strong className="text-sm font-semibold text-foreground">{itemName(state, line.itemId)}</strong>
                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{line.releasedQuantity} released</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Returned (total received)" type="number" min="0" max={line.releasedQuantity} step="1" value={line.returnedQuantity} error={fieldErrors.returned} onChange={(value) => updateLine(line.id, 'returnedQuantity', value)} />
                    <Field label="Damaged (of returned)" type="number" min="0" max={Math.max(0, quantities.returned)} step="1" value={line.damagedQuantity} error={fieldErrors.damaged} onChange={(value) => updateLine(line.id, 'damagedQuantity', value)} />
                    <Field label="Additional charge (₱)" type="number" min="0" step="0.01" value={line.additionalCharge} error={fieldErrors.charge} onChange={(value) => updateLine(line.id, 'additionalCharge', value)} />
                  </div>
                  <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-3 text-xs tabular-nums text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span><strong className="font-semibold text-foreground">{quantities.released}</strong> released = <strong className="font-semibold text-foreground">{quantities.returned}</strong> returned + <strong className={quantities.missing > 0 ? 'font-semibold text-destructive' : 'font-semibold text-foreground'}>{quantities.missing}</strong> missing</span>
                    <span><strong className="font-semibold text-foreground">{quantities.returned}</strong> returned = <strong className="font-semibold text-success">{quantities.usable}</strong> usable + <strong className="font-semibold text-warning">{quantities.damaged}</strong> damaged</span>
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
