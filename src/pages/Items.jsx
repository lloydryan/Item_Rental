import { useEffect, useState } from 'react'
import { CircleMinus, ImagePlus, LoaderCircle, Package, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { Field, SelectField, TextareaField } from '../components/Field'
import { ActionMenu, Dialog, MenuItem, Sheet } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { Tabs } from '../components/Tabs'
import { today } from '../constants'
import { categoryName } from '../utils/lookups'
import { getAvailableQuantity, getUnavailableQuantity, peso } from '../utils/rental'
import { formatImageSize, optimizeItemImage } from '../utils/image'

function emptyItem(categoryId = '') {
  return { categoryId, name: '', description: '', imageFile: null, rentalPrice: '', totalQuantity: '', damagedQuantity: 0, missingQuantity: 0, status: 'Available' }
}

export function Items({ state, actions }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [view, setView] = useState('all')
  const [form, setForm] = useState(emptyItem(state.categories[0]?.id))
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')
  const [imageInfo, setImageInfo] = useState('')
  const [optimizingImage, setOptimizingImage] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
  const [categoryError, setCategoryError] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const [stockAction, setStockAction] = useState(null)
  const [stockForm, setStockForm] = useState({ quantity: '', reason: '' })
  const [stockSaving, setStockSaving] = useState(false)
  const [stockError, setStockError] = useState('')

  useEffect(() => () => { if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  function openCreate() {
    setEditing(null)
    setForm(emptyItem(state.categories[0]?.id))
    setImagePreview('')
    setImageError('')
    setImageInfo('')
    setNameError('')
    setError('')
    setAddingCategory(!state.categories.length)
    setCategoryForm({ name: '', description: '' })
    setCategoryError('')
    setOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ categoryId: item.categoryId, name: item.name, description: item.description, imageFile: null, rentalPrice: item.rentalPrice, totalQuantity: item.totalQuantity, damagedQuantity: item.damagedQuantity, missingQuantity: item.missingQuantity, status: 'Available' })
    setImagePreview(item.imageUrl)
    setImageError('')
    setImageInfo('')
    setNameError('')
    setError('')
    setAddingCategory(false)
    setCategoryForm({ name: '', description: '' })
    setCategoryError('')
    setOpen(true)
  }

  async function createCategory() {
    if (!categoryForm.name.trim()) { setCategoryError('Enter a category name.'); return }
    setCategorySaving(true)
    setCategoryError('')
    try {
      const created = await actions.createCategory(categoryForm)
      setForm((current) => ({ ...current, categoryId: created.id }))
      setCategoryForm({ name: '', description: '' })
      setAddingCategory(false)
    } catch (createError) {
      setCategoryError(createError.code === '23505' ? 'A category with this name already exists.' : createError.message)
    } finally {
      setCategorySaving(false)
    }
  }

  async function selectImage(event) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setOptimizingImage(true)
    setImageError('')
    setImageInfo('')
    try {
      const optimized = await optimizeItemImage(file)
      setForm((current) => ({ ...current, imageFile: optimized.file }))
      setImagePreview(URL.createObjectURL(optimized.file))
      setImageInfo(`Optimized from ${formatImageSize(optimized.originalBytes)} to ${formatImageSize(optimized.file.size)} WebP · ${optimized.width} × ${optimized.height}px`)
    } catch (optimizationError) {
      setImageError(optimizationError.message)
    } finally {
      setOptimizingImage(false)
      input.value = ''
    }
  }

  async function save(event) {
    event.preventDefault()
    if (optimizingImage) { setImageError('Wait for the image to finish optimizing.'); return }
    if (!form.name.trim()) { setNameError('Enter an item name.'); return }
    if (!form.imageFile && !editing?.imageUrl) { setImageError('Choose an image for this item.'); return }
    setSaving(true)
    setError('')
    try {
      if (editing) await actions.updateItem(editing.id, form, editing.imageUrl)
      else await actions.createItem(form)
      setOpen(false)
      setEditing(null)
      setImagePreview('')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  function openStockAction(item, type) {
    setStockAction({ item, type })
    setStockForm({ quantity: '', reason: '' })
    setStockError('')
  }

  function closeStockAction() {
    if (stockSaving) return
    setStockAction(null)
    setStockError('')
  }

  async function submitStockAction(event) {
    event.preventDefault()
    const { item, type } = stockAction
    const quantity = Number(stockForm.quantity)
    if (type !== 'Dispose Unavailable' && (!Number.isInteger(quantity) || quantity < 1)) {
      setStockError('Enter a whole-number quantity of at least one.')
      return
    }
    if (type === 'Remove' && !stockForm.reason.trim()) {
      setStockError('Enter a reason for removing this stock.')
      return
    }

    setStockSaving(true)
    setStockError('')
    try {
      await actions.adjustItemStock(item.id, type, type === 'Dispose Unavailable' ? null : quantity, stockForm.reason)
      setStockAction(null)
    } catch (adjustmentError) {
      setStockError(adjustmentError.message)
    } finally {
      setStockSaving(false)
    }
  }

  const available = (item) => getAvailableQuantity(item, today, today, state.reservations)
  const filtered = state.items.filter((item) => view === 'all' || available(item) > 0)

  const rows = filtered.map((item) => [
    <div className="flex min-w-44 items-center gap-3" key={item.id}>
      {item.imageUrl ? <img className="size-12 shrink-0 rounded-lg border object-cover" src={item.imageUrl} alt="" loading="lazy" /> : <span className="grid size-12 shrink-0 place-items-center rounded-lg border bg-muted text-subtle-foreground"><Package className="size-5" aria-hidden="true" /></span>}
      <div className="min-w-0"><strong className="block truncate font-semibold text-foreground">{item.name}</strong><span className="block max-w-56 truncate text-xs text-muted-foreground">{item.description || 'No description'}</span></div>
    </div>,
    categoryName(state, item.categoryId),
    peso.format(item.rentalPrice),
    item.totalQuantity,
    getUnavailableQuantity(item),
    available(item),
    <StatusBadge key={`${item.id}-status`} status="Available" />,
    <ActionMenu key={`${item.id}-actions`} label={`Actions for ${item.name}`}>
      <MenuItem onClick={() => openEdit(item)}><Pencil className="size-4" />Edit item</MenuItem>
      <MenuItem onClick={() => openStockAction(item, 'Add')}><PackagePlus className="size-4" />Add stock</MenuItem>
      {available(item) > 0 && <MenuItem onClick={() => openStockAction(item, 'Remove')}><CircleMinus className="size-4" />Remove stock</MenuItem>}
      {getUnavailableQuantity(item) > 0 && <MenuItem tone="danger" onClick={() => openStockAction(item, 'Dispose Unavailable')}><Trash2 className="size-4" />Dispose unavailable</MenuItem>}
    </ActionMenu>,
  ])

  return (
    <Page title="Items" eyebrow="Inventory catalog" description="Manage rentable items, photos, stock levels, and availability." actions={<Button type="button" onClick={openCreate}><Plus className="size-4" />Add item</Button>}>
      <Tabs value={view} onChange={setView} items={[{ value: 'all', label: 'All items', count: state.items.length }, { value: 'available', label: 'Available now' }]} />
      <DataTable title="Inventory" columns={['Item', 'Category', 'Rate', 'Stock', 'Unavailable', 'Available', 'Status', 'Actions']} rows={rows} />

      <Sheet open={open} onClose={() => { if (!saving && !optimizingImage && !categorySaving) setOpen(false) }} title={editing ? 'Edit inventory item' : 'Add inventory item'} description={editing ? 'Update item details, photo, and rental price.' : 'Register a rentable item and its available stock.'} footer={<><Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving || optimizingImage || categorySaving}>Cancel</Button><Button type="submit" form="item-form" loading={saving} disabled={!state.categories.length || optimizingImage || categorySaving}>{editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}{editing ? 'Save changes' : 'Add item'}</Button></>}>
        <form id="item-form" className="grid gap-5" onSubmit={save}>
          <Alert>{error}</Alert>
          <section className="grid gap-4">
            <div><h3 className="text-sm font-semibold text-foreground">Item information</h3><p className="mt-1 text-xs text-muted-foreground">Name, category, photo, description, and daily pricing.</p></div>
            <div className="grid gap-3">
              <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <SelectField label="Category" value={form.categoryId || ''} onChange={(categoryId) => setForm({ ...form, categoryId })} required disabled={!state.categories.length}><option value="" disabled>{state.categories.length ? 'Select a category' : 'No categories yet'}</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SelectField>
                <Button variant="secondary" type="button" onClick={() => { setAddingCategory((value) => !value); setCategoryError('') }}><Plus className="size-4" />{addingCategory ? 'Close' : 'Add category'}</Button>
              </div>
              {addingCategory && <div className="grid gap-3 rounded-lg border border-border-subtle bg-secondary/70 p-4"><div><h4 className="text-sm font-semibold text-foreground">New category</h4><p className="mt-1 text-xs text-muted-foreground">Create it here, then it will be selected automatically.</p></div><Alert>{categoryError}</Alert><Field label="Category name" value={categoryForm.name} onChange={(name) => setCategoryForm({ ...categoryForm, name })} required /><TextareaField label="Description" value={categoryForm.description} onChange={(description) => setCategoryForm({ ...categoryForm, description })} rows={2} /><div className="flex justify-end gap-2"><Button variant="ghost" size="sm" type="button" disabled={categorySaving} onClick={() => { setAddingCategory(false); setCategoryError('') }}>Cancel</Button><Button size="sm" type="button" loading={categorySaving} onClick={createCategory}>Create category</Button></div></div>}
            </div>
            <Field label="Item name" value={form.name} onChange={(name) => setForm({ ...form, name })} error={nameError} required />
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-foreground">Item image<span className="ml-1 text-destructive" aria-hidden="true">*</span></span>
              <label className={`group grid cursor-pointer grid-cols-[5rem_1fr] items-center gap-4 rounded-xl border border-dashed p-3 transition hover:border-primary hover:bg-primary-soft ${imageError ? 'border-destructive-indicator' : 'border-border'}`}>
                <span className="grid size-20 place-items-center overflow-hidden rounded-lg bg-muted text-subtle-foreground">{optimizingImage ? <LoaderCircle className="size-6 animate-spin" aria-hidden="true" /> : imagePreview ? <img className="size-full object-cover" src={imagePreview} alt="Selected item preview" /> : <ImagePlus className="size-6" aria-hidden="true" />}</span>
                <span><strong className="block text-sm font-semibold text-foreground">{optimizingImage ? 'Optimizing image…' : form.imageFile ? form.imageFile.name : imagePreview ? 'Replace item photo' : 'Choose an item photo'}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">JPG, PNG, WebP, or AVIF up to 20 MB. Converted to WebP under 350 KB.</span></span>
                <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={selectImage} disabled={optimizingImage} aria-required={!form.imageFile && !editing?.imageUrl} />
              </label>
              {imageError && <span className="text-xs font-medium text-destructive">{imageError}</span>}
              {imageInfo && !imageError && <span className="text-xs font-medium text-success">{imageInfo}</span>}
            </div>
            <TextareaField label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
            <Field label="Rental price" type="number" min="0" step="0.01" value={form.rentalPrice} onChange={(rentalPrice) => setForm({ ...form, rentalPrice })} />
          </section>
          {!editing && <section className="grid gap-4 border-t pt-5">
            <div><h3 className="text-sm font-semibold text-foreground">Stock</h3><p className="mt-1 text-xs text-muted-foreground">Set the total quantity. Maintenance and repair quantities are managed on their own page.</p></div>
            <Field label="Total quantity" type="number" min={Number(form.damagedQuantity) + Number(form.missingQuantity)} step="1" value={form.totalQuantity} onChange={(totalQuantity) => setForm({ ...form, totalQuantity })} />
          </section>}
        </form>
      </Sheet>

      <Dialog
        open={Boolean(stockAction)}
        onClose={closeStockAction}
        title={stockAction?.type === 'Add' ? 'Add stock' : stockAction?.type === 'Remove' ? 'Remove stock' : 'Dispose unavailable stock'}
        description={stockAction ? `${stockAction.item.name} · Current total: ${stockAction.item.totalQuantity}` : ''}
        size="sm"
        footer={<><Button variant="outline" type="button" onClick={closeStockAction} disabled={stockSaving}>Cancel</Button><Button variant={stockAction?.type === 'Dispose Unavailable' ? 'destructive' : 'primary'} type="submit" form="stock-adjustment-form" loading={stockSaving}>{stockAction?.type === 'Add' ? <PackagePlus className="size-4" /> : stockAction?.type === 'Remove' ? <CircleMinus className="size-4" /> : <Trash2 className="size-4" />}{stockAction?.type === 'Add' ? 'Add stock' : stockAction?.type === 'Remove' ? 'Remove stock' : 'Dispose unavailable'}</Button></>}
      >
        {stockAction && <form id="stock-adjustment-form" className="grid gap-4" onSubmit={submitStockAction}>
          <Alert>{stockError}</Alert>
          {stockAction.type !== 'Dispose Unavailable' && <Field label="Quantity" type="number" min="1" max={stockAction.type === 'Remove' ? available(stockAction.item) : undefined} step="1" value={stockForm.quantity} onChange={(quantity) => setStockForm({ ...stockForm, quantity })} helper={stockAction.type === 'Remove' ? `${available(stockAction.item)} currently available. Reserved quantities are protected.` : 'This increases the total and available stock.'} required />}
          {stockAction.type === 'Remove' && <TextareaField label="Reason" value={stockForm.reason} onChange={(reason) => setStockForm({ ...stockForm, reason })} helper="Required for the inventory audit trail." required />}
          {stockAction.type === 'Add' && <TextareaField label="Notes" value={stockForm.reason} onChange={(reason) => setStockForm({ ...stockForm, reason })} helper="Optional, for example a supplier or purchase reference." />}
          {stockAction.type === 'Dispose Unavailable' && <div className="grid gap-4">
            <p className="text-sm leading-6 text-muted-foreground">This permanently removes unavailable units from total stock and resets the damaged and missing quantities to zero.</p>
            <dl className="divide-y divide-border-subtle border-y text-sm">
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Damaged</dt><dd className="font-medium tabular-nums">{stockAction.item.damagedQuantity}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Missing</dt><dd className="font-medium tabular-nums">{stockAction.item.missingQuantity}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">New total stock</dt><dd className="font-semibold tabular-nums">{stockAction.item.totalQuantity - getUnavailableQuantity(stockAction.item)}</dd></div>
            </dl>
            <TextareaField label="Disposal notes" value={stockForm.reason} onChange={(reason) => setStockForm({ ...stockForm, reason })} helper="Optional details about disposal or write-off." />
          </div>}
        </form>}
      </Dialog>
    </Page>
  )
}
