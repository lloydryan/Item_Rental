export const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function overlaps(startA, endA, startB, endB) {
  return new Date(startA) <= new Date(endB) && new Date(startB) <= new Date(endA)
}

export function getReservedQuantity(itemId, startDate, endDate, reservations, excludeId) {
  return reservations
    .filter((reservation) => reservation.id !== excludeId)
    .filter((reservation) => !['Cancelled', 'Completed'].includes(reservation.status))
    .filter((reservation) =>
      overlaps(startDate, endDate, reservation.startDate, reservation.endDate),
    )
    .flatMap((reservation) => reservation.items)
    .filter((line) => line.itemId === itemId)
    .reduce((sum, line) => sum + Number(line.quantity || 0), 0)
}

export function getUnavailableQuantity(item) {
  return Number(item.damagedQuantity || 0) + Number(item.missingQuantity || 0)
}

export function getAvailableQuantity(item, startDate, endDate, reservations, excludeId) {
  const committed = startDate && endDate
    ? getReservedQuantity(item.id, startDate, endDate, reservations, excludeId)
    : 0
  return Math.max(0, Number(item.totalQuantity || 0) - getUnavailableQuantity(item) - committed)
}

export function reservationTotal(reservation, items) {
  const days = Math.max(1, Number(reservation.durationDays || 1))
  const linesTotal = reservation.items.reduce((sum, line) => {
    const item = items.find((record) => record.id === line.itemId)
    const unitPrice = line.unitPrice ?? item?.rentalPrice ?? 0
    return sum + Number(line.quantity || 0) * Number(unitPrice) * days
  }, 0)
  return linesTotal + Number(reservation.deliveryCharge || 0) + Number(reservation.additionalCharges || 0)
}

export function totalPaid(rentalId, payments) {
  return payments
    .filter((payment) => payment.rentalId === rentalId)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
}

export function paymentStatus(total, paid) {
  if (paid <= 0) return 'Unpaid'
  if (paid < total) return 'Partially Paid'
  return 'Paid'
}

export function returnDiscrepancy(line) {
  const released = Number(line.releasedQuantity || 0)
  const returned = Number(line.returnedQuantity || 0)
  const damaged = Number(line.damagedQuantity || 0)
  return {
    missing: Math.max(0, released - returned),
    damaged,
  }
}
