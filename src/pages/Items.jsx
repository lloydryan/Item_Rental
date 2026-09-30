import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { controlClasses, Field } from '../components/Field'
import { Sheet } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { itemStatuses, today } from '../constants'
import { categoryName } from '../utils/lookups'
import { getAvailableQuantity, getUnavailableQuantity, peso } from '../utils/rental'

export function Items({ state, actions }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('all')
  const [form, setForm] = useState({ categoryId: state.categories[0]?.id || '', name: '', description: '', rentalPrice: '', totalQuantity: '', damagedQuantity: 0, missingQuantity: 0, status: 'Available' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!form.name.trim()) { setNameError('Enter an item name.'); return }
    setSaving(true)
    setError('')
    try {
      await actions.createItem(form)
      setForm({ ...form, name: '', description: '', rentalPrice: '', totalQuantity: '', damagedQuantity: 0, missingQuantity: 0 })
      setNameError('')
      setOpen(false)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const available = (item) => getAvailableQuantity(item, today, today, state.reservations)
  const filtered = state.items.filter((item) => view === 'all' || (view === 'available' && available(item) > 0 && item.status === 'Available') || (view === 'rented' && item.status === 'Rented') || (view === 'maintenance' && ['Damaged', 'Under Maintenance'].includes(item.status)))

  return (
    <Page title="Items" eyebrow="Inventory catalog" description="Manage rentable items, stock levels, and availability." actions={<Button type="button" onClick={() => setOpen(true)}><Plus className="size-4" />Add item</Button>}>
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All items', count: state.items.length }, { value: 'available', label: 'Available' }, { value: 'rented', label: 'Rented' }, { value: 'maintenance', label: 'Maintenance' }]} />
      <DataTable title="Inventory" columns={['Item', 'Category', 'Rate', 'Stock', 'Unavailable', 'Available', 'Status']} rows={filtered.map((item) => [item.name, categoryName(state, item.categoryId), peso.format(item.rentalPrice), item.totalQuantity, getUnavailableQuantity(item), available(item), <StatusBadge key={item.id} status={item.status} />])} />

      <Sheet open={open} onClose={() => setOpen(false)} title="Add inventory item" description="Register a rentable item and its available stock." footer={<><Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="item-form" loading={saving} disabled={!state.categories.length}><Plus className="size-4" />Add item</Button></>}>
        <form id="item-form" className="grid gap-5" onSubmit={save}>
          <Alert>{error}</Alert>
          <section className="grid gap-4"><div><h3 className="text-sm font-semibold text-gray-950">Item information</h3><p className="mt-1 text-xs text-gray-500">Name, category, description, and daily pricing.</p></div><label className="grid gap-1.5 text-sm font-medium text-gray-700">Category<select className={controlClasses} value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><Field label="Item name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={nameError} required /><Field label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} /><Field label="Rental price" type="number" min="0" step="0.01" value={form.rentalPrice} onChange={(rentalPrice) => setForm({ ...form, rentalPrice })} /></section>
          <section className="grid gap-4 border-t pt-5"><div><h3 className="text-sm font-semibold text-gray-950">Stock and status</h3><p className="mt-1 text-xs text-gray-500">Set the quantity available to rental operations.</p></div><Field label="Total quantity" type="number" min="0" step="1" value={form.totalQuantity} onChange={(totalQuantity) => setForm({ ...form, totalQuantity })} /><label className="grid gap-1.5 text-sm font-medium text-gray-700">Status<select className={controlClasses} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{itemStatuses.map((status) => <option key={status}>{status}</option>)}</select></label></section>
        </form>
      </Sheet>
    </Page>
  )
}
