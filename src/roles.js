export const roles = {
  owner: 'Owner / Manager',
  rental: 'Rental Staff',
  inventory: 'Inventory Staff',
  delivery: 'Delivery Personnel',
}

export const roleAccess = {
  owner: ['dashboard', 'customers', 'items', 'reservations', 'rentals', 'payments', 'deliveries', 'returns', 'reports', 'users'],
  rental: ['dashboard', 'customers', 'reservations', 'rentals', 'payments', 'reports'],
  inventory: ['dashboard', 'items', 'rentals', 'returns', 'reports'],
  delivery: ['dashboard', 'deliveries'],
}
