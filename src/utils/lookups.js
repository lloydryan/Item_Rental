export function categoryName(state, id) {
  return state.categories.find((category) => category.id === id)?.name || 'Uncategorized'
}

export function customerName(state, id) {
  return state.customers.find((customer) => customer.id === id)?.name || 'Unknown customer'
}

export function itemName(state, id) {
  return state.items.find((item) => item.id === id)?.name || 'Unknown item'
}

export function itemLineText(state, lines) {
  return lines.map((line) => `${line.quantity} ${itemName(state, line.itemId)}`).join(', ')
}

export function reservationById(state, id) {
  return state.reservations.find((reservation) => reservation.id === id) || state.reservations[0]
}

export function customerRentalCount(state, customerId) {
  const reservationIds = state.reservations
    .filter((reservation) => reservation.customerId === customerId)
    .map((reservation) => reservation.id)
  return state.rentals.filter((rental) => reservationIds.includes(rental.reservationId)).length
}
