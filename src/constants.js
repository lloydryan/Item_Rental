import {
  ArrowLeftRight,
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
  Wrench,
} from 'lucide-react'

const now = new Date()
export const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

export const navItems = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'Workspace' },
  { key: 'customers', label: 'Customers', path: '/customers', icon: Users, group: 'Workspace' },
  { key: 'items', label: 'Items', path: '/items', icon: Warehouse, group: 'Operations' },
  { key: 'inventoryMovements', label: 'Inventory Movements', path: '/inventory-movements', icon: ArrowLeftRight, group: 'Operations' },
  { key: 'maintenance', label: 'Maintenance & Repair', path: '/maintenance', icon: Wrench, group: 'Operations' },
  { key: 'reservations', label: 'Reservations', path: '/reservations', icon: CalendarDays, group: 'Operations' },
  { key: 'rentals', label: 'Rentals', path: '/rentals', icon: PackageCheck, group: 'Operations' },
  { key: 'payments', label: 'Payments', path: '/payments', icon: CreditCard, group: 'Operations' },
  { key: 'deliveries', label: 'Delivery & Pickup', path: '/deliveries', icon: Truck, group: 'Management' },
  { key: 'returns', label: 'Returns & Damage', path: '/returns', icon: ClipboardCheck, group: 'Management' },
  { key: 'reports', label: 'Reports', path: '/reports', icon: FileBarChart, group: 'Management' },
  { key: 'users', label: 'Users', path: '/users', icon: UserCog, group: 'System' },
]

export const itemStatuses = ['Available']
export const rentalStatuses = ['Reserved', 'Ready for Release', 'Released', 'Active', 'Returned']
export const deliveryStatuses = ['Pending', 'Scheduled', 'Out for Delivery', 'Delivered', 'For Pickup', 'Picked Up', 'Completed']
