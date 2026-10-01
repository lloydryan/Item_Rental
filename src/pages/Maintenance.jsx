import { useMemo, useState } from 'react'
import { Check, Package, Plus, Wrench } from 'lucide-react'
import { Alert } from '../components/Feedback'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Field, SelectField, TextareaField } from '../components/Field'
import { Dialog } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { today } from '../constants'
import { getAvailableQuantity } from '../utils/rental'

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

export function Maintenance({ state, actions }) {
  const [view, setView] = useState('active')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ itemId: '', movementType: 'Maintenance', quantity: 1, notes: '' })
  const [saving, setSaving] = useState(false)
  const [completingId, setCompletingId] = useState('')
  const [error, setError] = useState('')

  const availableItems = useMemo(() => state.items.filter((item) => getAvailableQuantity(item, today, today, state.reservations) > 0), [state.items, state.reservations])
  const movements = state.inventoryMovements || []
  const active = movements.filter((movement) => movement.status === 'In Progress')
  const completed = movements.filter((movement) => movement.status === 'Completed')
  const visible = view === 'active' ? active : view === 'completed' ? completed : movements
  const selectedItem = state.items.find((item) => item.id === form.itemId)
  const selectedAvailable = selectedItem ? getAvailableQuantity(selectedItem, today, today, state.reservations) : 0

  function openCreate() {
    setForm({ itemId: availableItems[0]?.id || '', movementType: 'Maintenance', quantity: 1, notes: '' })
    setError('')
    setOpen(true)
  }

  async function startMaintenance(event) {
    event.preventDefault()
    const quantity = Number(form.quantity)
    if (!form.itemId) { setError('Choose an item.'); return }
    if (!Number.isInteger(quantity) || quantity < 1) { setError('Enter a whole-number quantity of at least one.'); return }
    if (quantity > selectedAvailable) { setError(`Only ${selectedAvailable} unit${selectedAvailable === 1 ? '' : 's'} are currently available.`); return }
    setSaving(true)
    setError('')
    try {
      await actions.startInventoryMovement({ ...form, quantity })
      setOpen(false)
      setView('active')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function markFixed(movement) {
    setCompletingId(movement.id)
    setError('')
    try {
      await actions.completeInventoryMovement(movement.id)
    } catch (completionError) {
      setError(completionError.message)
    } finally {
      setCompletingId('')
    }
  }

  const rows = visible.map((movement) => {
    const item = state.items.find((record) => record.id === movement.itemId)
    const createdBy = state.users.find((user) => user.id === movement.createdBy)?.name || 'Staff member'
    const completedBy = state.users.find((user) => user.id === movement.completedBy)?.name || 'Staff member'
    const activeStatus = movement.movementType === 'Repair' ? 'Under Repair' : 'Under Maintenance'
    return [
      <div className="flex min-w-44 items-center gap-3" key={`${movement.id}-item`}>
        {item?.imageUrl ? <img className="size-11 shrink-0 rounded-lg border object-cover" src={item.imageUrl} alt="" loading="lazy" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground"><Package className="size-5" /></span>}
        <strong className="font-semibold text-foreground">{item?.name || 'Unknown item'}</strong>
      </div>,
      movement.movementType,
      movement.quantity,
      movement.notes || '—',
      <div className="min-w-36" key={`${movement.id}-logged`}><span className="block font-medium">{createdBy}</span><span className="block text-xs text-muted-foreground">{formatDate(movement.createdAt)}</span></div>,
      <StatusBadge key={`${movement.id}-status`} status={movement.status === 'Completed' ? 'Fixed' : activeStatus} />,
      movement.status === 'Completed'
        ? <div className="min-w-36" key={`${movement.id}-completed`}><span className="block font-medium">{completedBy}</span><span className="block text-xs text-muted-foreground">{formatDate(movement.completedAt)}</span></div>
        : <Button key={`${movement.id}-action`} size="sm" variant="secondary" type="button" loading={completingId === movement.id} disabled={Boolean(completingId)} onClick={() => markFixed(movement)}><Check className="size-4" />Mark fixed</Button>,
    ]
  })

  return (
    <Page title="Maintenance & Repair" eyebrow="Service queue" description="Review every item marked for service and return fixed quantities to available stock." actions={<Button type="button" onClick={openCreate} disabled={!availableItems.length}><Plus className="size-4" />Add to queue</Button>}>
      <section className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 lg:grid-cols-[minmax(10rem,0.7fr)_minmax(12rem,0.9fr)_minmax(18rem,1.5fr)]" aria-label="Maintenance summary">
        <dl className="px-5 py-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Active jobs</dt>
          <dd className="mt-1 text-2xl font-bold leading-8 tabular-nums text-foreground">{active.length}</dd>
        </dl>
        <dl className="border-t border-border-subtle px-5 py-4 sm:border-l sm:border-t-0">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Units being serviced</dt>
          <dd className="mt-1 text-2xl font-bold leading-8 tabular-nums text-foreground">{active.reduce((sum, movement) => sum + Number(movement.quantity), 0)}</dd>
        </dl>
        <div className="flex items-center gap-3 border-t border-border-subtle bg-secondary/45 px-5 py-4 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success" aria-hidden="true"><Check className="size-4" /></span>
          <div>
            <p className="text-sm font-medium text-foreground">Automatic stock update</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Fixed units return to available inventory when checked off.</p>
          </div>
        </div>
      </section>
      <Alert>{!open ? error : ''}</Alert>
      <Tabs value={view} onChange={setView} label="Maintenance filters" items={[{ value: 'active', label: 'Needs attention', count: active.length }, { value: 'completed', label: 'Fixed', count: completed.length }, { value: 'all', label: 'All records', count: movements.length }]} />
      <DataTable title="Service records" columns={['Item', 'Type', 'Quantity', 'Issue / notes', 'Logged by', 'Status', 'Checked / action']} rows={rows} searchPlaceholder="Search maintenance records…" />

      <Dialog open={open} onClose={() => { if (!saving) setOpen(false) }} title="Add item to maintenance or repair" description="The selected quantity will be unavailable for reservations until it is marked fixed." footer={<><Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" form="maintenance-form" loading={saving} disabled={!availableItems.length}><Wrench className="size-4" />Add to queue</Button></>}>
        <form id="maintenance-form" className="grid gap-4" onSubmit={startMaintenance}>
          <Alert>{error}</Alert>
          <SelectField label="Item" value={form.itemId} onChange={(itemId) => setForm({ ...form, itemId, quantity: 1 })} required>
            <option value="" disabled>Select an available item</option>
            {availableItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({getAvailableQuantity(item, today, today, state.reservations)} available)</option>)}
          </SelectField>
          <SelectField label="Service type" value={form.movementType} onChange={(movementType) => setForm({ ...form, movementType })} required><option>Maintenance</option><option>Repair</option></SelectField>
          <Field label="Quantity" type="number" min="1" max={selectedAvailable || 1} step="1" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} helper={`${selectedAvailable} currently available for this item.`} required />
          <TextareaField label="Issue or work required" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} helper="Add enough detail for the person checking or repairing the item." required />
        </form>
      </Dialog>
    </Page>
  )
}
