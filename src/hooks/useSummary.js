import { useMemo } from 'react'
import { today } from '../constants'
import { getAvailableQuantity, reservationTotal, totalPaid } from '../utils/rental'
import { categoryName, reservationById } from '../utils/lookups'

export function useSummary(state) {
  return useMemo(() => {
    const availableByCategory = { Table: 0, Chair: 0, Speaker: 0 }
    state.items.forEach((item) => {
      const category = categoryName(state, item.categoryId)
      if (!(category in availableByCategory)) availableByCategory[category] = 0
      availableByCategory[category] += getAvailableQuantity(item, today, today, state.reservations)
    })

    const income = state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const pendingPayments = state.rentals.filter((rental) => {
      const total = reservationTotal(reservationById(state, rental.reservationId), state.items)
      return totalPaid(rental.id, state.payments) < total
    }).length

    return {
      income,
      pendingPayments,
      availableByCategory,
      todayRentals: state.rentals.filter((rental) => rental.releaseDate === today).length,
      upcomingReservations: state.reservations.filter((reservation) => reservation.startDate >= today && reservation.status !== 'Cancelled').length,
      rentedItems: state.reservations
        .filter((reservation) => ['Confirmed', 'Ready for Release', 'Released'].includes(reservation.status))
        .flatMap((reservation) => reservation.items)
        .reduce((sum, line) => sum + Number(line.quantity || 0), 0),
      pendingReturns: state.rentals.filter((rental) => !['Completed', 'Cancelled'].includes(rental.status)).length,
    }
  }, [state])
}
