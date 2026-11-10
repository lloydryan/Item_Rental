import { supabase } from './supabase'

const DAY_MS = 86_400_000

function durationDays(startDate, endDate) {
  return Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / DAY_MS) + 1)
}

function throwIfError(result) {
  if (result.error) throw result.error
  return result.data
}

function mapProfile(profile, authUser) {
  return { id: profile.id, name: profile.full_name, email: profile.email || (profile.id === authUser.id ? authUser.email : ''), role: profile.role, active: profile.is_active }
}

function mapCustomer(row) {
  return { id: row.id, name: row.name, contactNumber: row.contact_number, email: row.email || '', address: row.address || '', createdAt: row.created_at }
}

function mapItem(row) {
  return { id: row.id, categoryId: row.category_id, name: row.name, description: row.description || '', imageUrl: row.image_url || '', rentalPrice: Number(row.rental_price), totalQuantity: row.total_quantity, damagedQuantity: row.damaged_quantity, missingQuantity: row.missing_quantity, status: row.status }
}

function mapReservation(row, lines) {
  return {
    id: row.id, customerId: row.customer_id, startDate: row.start_date, endDate: row.end_date,
    durationDays: durationDays(row.start_date, row.end_date), eventLocation: row.event_location,
    deliveryRequired: row.delivery_required, deliveryCharge: Number(row.delivery_charge),
    additionalCharges: Number(row.additional_charges), status: row.status,
    items: lines.filter((line) => line.reservation_id === row.id).map((line) => ({ id: line.id, itemId: line.item_id, quantity: line.quantity, unitPrice: Number(line.unit_price) })),
  }
}

function mapRental(row) {
  return { id: row.id, reservationId: row.reservation_id, releaseDate: row.release_date || '', expectedReturnDate: row.expected_return_date, actualReturnDate: row.actual_return_date || '', rentalAmount: Number(row.rental_amount), deliveryCharge: Number(row.delivery_charge), additionalCharges: Number(row.additional_charges), status: row.status }
}

function mapPayment(row) {
  return { id: row.id, rentalId: row.rental_id, amount: Number(row.amount), paymentDate: row.payment_date, method: row.method, referenceNumber: row.reference_number || '', notes: row.notes || '' }
}

function mapDelivery(row) {
  return { id: row.id, rentalId: row.rental_id, address: row.address, deliveryDateTime: row.delivery_date_time || '', deliveryCharge: Number(row.delivery_charge), deliveryStatus: row.delivery_status, pickupSchedule: row.pickup_schedule || '', pickupStatus: row.pickup_status, assignedUserId: row.assigned_user_id, notes: row.notes || '' }
}

function mapReturn(row, lines) {
  return {
    id: row.id, rentalId: row.rental_id, inspectionDate: row.inspection_date, status: row.status, notes: row.notes || '',
    items: lines.filter((line) => line.return_record_id === row.id).map((line) => ({ id: line.id, itemId: line.item_id, releasedQuantity: line.released_quantity, returnedQuantity: line.returned_quantity, damagedQuantity: line.damaged_quantity, additionalCharge: Number(line.additional_charge) })),
  }
}

function mapInventoryMovement(row) {
  return {
    id: row.id, itemId: row.item_id, movementType: row.movement_type,
    quantity: row.quantity, notes: row.notes || '', status: row.status,
    createdBy: row.created_by, completedBy: row.completed_by || '',
    createdAt: row.created_at, completedAt: row.completed_at || '',
  }
}

function mapStockAdjustment(row) {
  return {
    id: row.id, itemId: row.item_id, adjustmentType: row.adjustment_type,
    quantity: row.quantity, damagedQuantity: row.damaged_quantity,
    missingQuantity: row.missing_quantity, reason: row.reason || '',
    createdBy: row.created_by, createdAt: row.created_at,
  }
}

export async function loadApplicationData(authUser) {
  const results = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('customers').select('*').order('created_at', { ascending: false }),
    supabase.from('item_categories').select('*').order('name'),
    supabase.from('items').select('*').order('name'),
    supabase.from('reservations').select('*').order('start_date', { ascending: false }),
    supabase.from('reservation_items').select('*'),
    supabase.from('rental_transactions').select('*').order('created_at', { ascending: false }),
    supabase.from('payments').select('*').order('payment_date', { ascending: false }),
    supabase.from('deliveries').select('*').order('delivery_date_time'),
    supabase.from('return_records').select('*').order('inspection_date', { ascending: false }),
    supabase.from('return_items').select('*'),
    supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }),
    supabase.from('inventory_stock_adjustments').select('*').order('created_at', { ascending: false }),
  ])
  const [profiles, customers, categories, items, reservations, reservationItems, rentals, payments, deliveries, returns, returnItems, inventoryMovements, stockAdjustments] = results.map(throwIfError)
  const currentProfile = profiles.find((profile) => profile.id === authUser.id)
  if (!currentProfile) {
    const error = new Error('Your account does not have an application profile yet.')
    error.code = 'PROFILE_MISSING'
    throw error
  }
  if (!currentProfile.is_active) {
    const error = new Error('Your staff account is inactive. Contact the owner for access.')
    error.code = 'PROFILE_INACTIVE'
    throw error
  }
  return {
    currentUser: mapProfile(currentProfile, authUser),
    state: {
      users: profiles.map((profile) => mapProfile(profile, authUser)),
      categories: categories.map((row) => ({ id: row.id, name: row.name, description: row.description || '' })),
      items: items.map(mapItem), customers: customers.map(mapCustomer),
      reservations: reservations.map((row) => mapReservation(row, reservationItems)),
      rentals: rentals.map(mapRental), payments: payments.map(mapPayment), deliveries: deliveries.map(mapDelivery),
      returns: returns.map((row) => mapReturn(row, returnItems)),
      inventoryMovements: inventoryMovements.map(mapInventoryMovement),
      stockAdjustments: stockAdjustments.map(mapStockAdjustment),
    },
  }
}

export async function createCustomer(form) {
  throwIfError(await supabase.from('customers').insert({ name: form.name.trim(), contact_number: form.contactNumber.trim(), email: form.email.trim() || null, address: form.address.trim() || null }))
}

export async function createCategory(form) {
  return throwIfError(await supabase.from('item_categories').insert({ name: form.name.trim(), description: form.description.trim() || null }).select('*').single())
}

async function uploadItemImage(file) {
  const extension = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${crypto.randomUUID()}.${extension}`
  const upload = await supabase.storage.from('item-images').upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false })
  if (upload.error) throw upload.error
  return { path, url: supabase.storage.from('item-images').getPublicUrl(path).data.publicUrl }
}

function itemImagePath(publicUrl) {
  const marker = '/object/public/item-images/'
  const index = publicUrl.indexOf(marker)
  return index === -1 ? '' : decodeURIComponent(publicUrl.slice(index + marker.length))
}

function itemPayload(form, imageUrl, includeStock = true) {
  const payload = { category_id: form.categoryId, name: form.name.trim(), description: form.description.trim() || null, image_url: imageUrl || null, rental_price: Number(form.rentalPrice || 0), status: 'Available' }
  return includeStock ? { ...payload, total_quantity: Number(form.totalQuantity || 0), damaged_quantity: Number(form.damagedQuantity || 0), missing_quantity: Number(form.missingQuantity || 0) } : payload
}

export async function createItem(form) {
  const image = form.imageFile ? await uploadItemImage(form.imageFile) : null

  const result = await supabase.from('items').insert(itemPayload(form, image?.url))
  if (result.error) {
    if (image) await supabase.storage.from('item-images').remove([image.path])
    throw result.error
  }
}

export async function updateItem(id, form, previousImageUrl) {
  const image = form.imageFile ? await uploadItemImage(form.imageFile) : null
  const result = await supabase.from('items').update(itemPayload(form, image?.url || previousImageUrl, false)).eq('id', id)
  if (result.error) {
    if (image) await supabase.storage.from('item-images').remove([image.path])
    throw result.error
  }
  const previousPath = image ? itemImagePath(previousImageUrl || '') : ''
  if (previousPath) await supabase.storage.from('item-images').remove([previousPath])
}

export async function startInventoryMovement(form) {
  return throwIfError(await supabase.rpc('start_inventory_movement', {
    p_item_id: form.itemId,
    p_movement_type: form.movementType,
    p_quantity: Number(form.quantity),
    p_notes: form.notes.trim() || null,
  }))
}

export async function completeInventoryMovement(id) {
  throwIfError(await supabase.rpc('complete_inventory_movement', { p_movement_id: id }))
}

export async function adjustItemStock(itemId, adjustmentType, quantity, reason) {
  return throwIfError(await supabase.rpc('adjust_item_stock', {
    p_item_id: itemId,
    p_adjustment_type: adjustmentType,
    p_quantity: quantity ? Number(quantity) : null,
    p_reason: reason?.trim() || null,
  }))
}

export async function createUser(form) {
  const result = await supabase.functions.invoke('admin-create-user', {
    body: { fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, role: form.role },
  })
  if (result.error) {
    let message = result.error.message
    try {
      const details = await result.error.context?.json()
      if (details?.error) message = details.error
    } catch {
      // Keep the SDK error when the response does not contain JSON.
    }
    throw new Error(message)
  }
  return result.data
}

export async function resetUserPassword(userId, password) {
  const result = await supabase.functions.invoke('admin-reset-password', {
    body: { userId, password },
  })
  if (result.error) {
    let message = result.error.message
    try {
      const details = await result.error.context?.json()
      if (details?.error) message = details.error
    } catch {
      // Keep the SDK error when the response does not contain JSON.
    }
    throw new Error(message)
  }
  return result.data
}

export async function changePassword(currentPassword, newPassword) {
  const result = await supabase.auth.updateUser({
    password: newPassword,
    current_password: currentPassword,
  })
  if (result.error) throw result.error
  return result.data
}

export async function createReservation(form, userId, items) {
  const reservation = throwIfError(await supabase.from('reservations').insert({ customer_id: form.customerId, start_date: form.startDate, end_date: form.endDate, event_location: form.eventLocation.trim(), delivery_required: form.deliveryRequired, delivery_charge: Number(form.deliveryCharge || 0), additional_charges: Number(form.additionalCharges || 0), status: form.status, created_by: userId }).select('id').single())
  const lines = form.items.map((line) => ({ reservation_id: reservation.id, item_id: line.itemId, quantity: Number(line.quantity), unit_price: Number(items.find((item) => item.id === line.itemId)?.rentalPrice || 0) }))
  const result = await supabase.from('reservation_items').insert(lines)
  if (result.error) {
    await supabase.from('reservations').delete().eq('id', reservation.id)
    throw result.error
  }
}

export async function createRentalFromReservation(reservationId) {
  return throwIfError(await supabase.rpc('create_rental_from_reservation', { p_reservation_id: reservationId }))
}

export async function updateReservationStatus(id, status) {
  throwIfError(await supabase.rpc('update_reservation_status', { p_reservation_id: id, p_status: status }))
}

export async function createPayment(form) {
  return throwIfError(await supabase.rpc('record_rental_payment', {
    p_rental_id: form.rentalId,
    p_amount: Number(form.amount),
    p_payment_date: form.paymentDate,
    p_method: form.method.trim(),
    p_request_key: form.requestKey,
    p_reference_number: form.referenceNumber.trim() || null,
    p_notes: form.notes?.trim() || null,
  }))
}

export async function updateRentalStatus(id, status) {
  throwIfError(await supabase.rpc('update_rental_status', { p_rental_id: id, p_status: status }))
}

export async function updateDelivery(id, patch) {
  const update = {}
  if (patch.deliveryStatus) update.delivery_status = patch.deliveryStatus
  if (patch.pickupStatus) update.pickup_status = patch.pickupStatus
  throwIfError(await supabase.from('deliveries').update(update).eq('id', id))
}

export async function updateProfileRole(id, role) {
  throwIfError(await supabase.from('profiles').update({ role }).eq('id', id))
}

export async function completeReturn(id, inspection) {
  throwIfError(await supabase.rpc('complete_return_inspection', {
    p_return_record_id: id,
    p_notes: inspection.notes.trim() || null,
    p_items: inspection.items.map((line) => ({
      id: line.id,
      returnedQuantity: Number(line.returnedQuantity),
      damagedQuantity: Number(line.damagedQuantity),
      additionalCharge: Number(line.additionalCharge),
    })),
  }))
}
