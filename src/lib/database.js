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
  return { id: profile.id, name: profile.full_name, email: profile.id === authUser.id ? authUser.email : '', role: profile.role, active: profile.is_active }
}

function mapCustomer(row) {
  return { id: row.id, name: row.name, contactNumber: row.contact_number, email: row.email || '', address: row.address || '', createdAt: row.created_at }
}

function mapItem(row) {
  return { id: row.id, categoryId: row.category_id, name: row.name, description: row.description || '', rentalPrice: Number(row.rental_price), totalQuantity: row.total_quantity, damagedQuantity: row.damaged_quantity, missingQuantity: row.missing_quantity, status: row.status }
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
  ])
  const [profiles, customers, categories, items, reservations, reservationItems, rentals, payments, deliveries, returns, returnItems] = results.map(throwIfError)
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
    },
  }
}

export async function createCustomer(form) {
  throwIfError(await supabase.from('customers').insert({ name: form.name.trim(), contact_number: form.contactNumber.trim(), email: form.email.trim() || null, address: form.address.trim() || null }))
}

export async function createItem(form) {
  throwIfError(await supabase.from('items').insert({ category_id: form.categoryId, name: form.name.trim(), description: form.description.trim() || null, rental_price: Number(form.rentalPrice || 0), total_quantity: Number(form.totalQuantity || 0), damaged_quantity: Number(form.damagedQuantity || 0), missing_quantity: Number(form.missingQuantity || 0), status: form.status }))
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

export async function createPayment(form) {
  throwIfError(await supabase.from('payments').insert({ rental_id: form.rentalId, amount: Number(form.amount), payment_date: form.paymentDate, method: form.method.trim(), reference_number: form.referenceNumber.trim() || null, notes: form.notes?.trim() || null }))
}

export async function updateRentalStatus(id, status) {
  throwIfError(await supabase.from('rental_transactions').update({ status }).eq('id', id))
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

export async function completeReturn(id) {
  throwIfError(await supabase.rpc('complete_return_inspection', { p_return_record_id: id }))
}
