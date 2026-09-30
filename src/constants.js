import {
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  PackageCheck,
  Truck,
  UserCog,
  Users,
  Warehouse,
} from 'lucide-react'

const now = new Date()
export const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

export const navItems = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'customers', label: 'Customers', path: '/customers', icon: Users },
  { key: 'items', label: 'Items', path: '/items', icon: Warehouse },
  { key: 'reservations', label: 'Reservations', path: '/reservations', icon: CalendarDays },
  { key: 'rentals', label: 'Rentals', path: '/rentals', icon: PackageCheck },
  { key: 'payments', label: 'Payments', path: '/payments', icon: CreditCard },
  { key: 'deliveries', label: 'Delivery & Pickup', path: '/deliveries', icon: Truck },
  { key: 'returns', label: 'Returns & Damage', path: '/returns', icon: ClipboardCheck },
  { key: 'reports', label: 'Reports', path: '/reports', icon: FileBarChart },
  { key: 'users', label: 'Users', path: '/users', icon: UserCog },
]

export const itemStatuses = ['Available', 'Reserved', 'Rented', 'Damaged', 'Under Maintenance', 'Missing']
export const rentalStatuses = ['Reserved', 'Ready for Release', 'Released', 'Active', 'Returned', 'Completed', 'Cancelled']
export const deliveryStatuses = ['Pending', 'Scheduled', 'Out for Delivery', 'Delivered', 'For Pickup', 'Picked Up', 'Completed']
