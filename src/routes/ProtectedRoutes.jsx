import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { navItems } from '../constants'
import { roleAccess } from '../roles'
import { Shell } from '../layouts/Shell'
import { Skeleton } from '../components/Feedback'

const Customers = lazy(() => import('../pages/Customers').then((module) => ({ default: module.Customers })))
const Dashboard = lazy(() => import('../pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const Deliveries = lazy(() => import('../pages/Deliveries').then((module) => ({ default: module.Deliveries })))
const Items = lazy(() => import('../pages/Items').then((module) => ({ default: module.Items })))
const InventoryMovements = lazy(() => import('../pages/InventoryMovements').then((module) => ({ default: module.InventoryMovements })))
const Maintenance = lazy(() => import('../pages/Maintenance').then((module) => ({ default: module.Maintenance })))
const Login = lazy(() => import('../pages/Login').then((module) => ({ default: module.Login })))
const Payments = lazy(() => import('../pages/Payments').then((module) => ({ default: module.Payments })))
const Rentals = lazy(() => import('../pages/Rentals').then((module) => ({ default: module.Rentals })))
const Reports = lazy(() => import('../pages/Reports').then((module) => ({ default: module.Reports })))
const Reservations = lazy(() => import('../pages/Reservations').then((module) => ({ default: module.Reservations })))
const NewReservation = lazy(() => import('../pages/NewReservation').then((module) => ({ default: module.NewReservation })))
const Returns = lazy(() => import('../pages/Returns').then((module) => ({ default: module.Returns })))
const UsersPage = lazy(() => import('../pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const Profile = lazy(() => import('../pages/Profile').then((module) => ({ default: module.Profile })))

function RouteSkeleton() {
  return <div className="grid gap-6" aria-label="Loading page"><div className="grid gap-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-8 w-56" /></div><Skeleton className="h-80 w-full" /></div>
}

export function AppRoutes({ state, actions, currentUser, onLogin, onLogout }) {
  return (
    <Suspense fallback={<RouteSkeleton />}><Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/dashboard" replace /> : <Login onLogin={onLogin} />} />
      <Route
        path="/*"
        element={
          currentUser ? (
            <Shell state={state} currentUser={currentUser} onLogout={onLogout}>
              <ProtectedRoutes state={state} actions={actions} currentUser={currentUser} />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes></Suspense>
  )
}

function ProtectedRoutes({ state, actions, currentUser }) {
  const access = roleAccess[currentUser.role]
  const defaultPath = navItems.find((item) => access.includes(item.key))?.path || '/dashboard'

  function guard(key, element) {
    return access.includes(key) ? element : <Navigate to={defaultPath} replace />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />
      <Route path="/dashboard" element={guard('dashboard', <Dashboard state={state} />)} />
      <Route path="/customers" element={guard('customers', <Customers state={state} actions={actions} />)} />
      <Route path="/items" element={guard('items', <Items state={state} actions={actions} />)} />
      <Route path="/inventory-movements" element={guard('inventoryMovements', <InventoryMovements state={state} />)} />
      <Route path="/maintenance" element={guard('maintenance', <Maintenance state={state} actions={actions} />)} />
      <Route path="/reservations" element={guard('reservations', <Reservations state={state} actions={actions} />)} />
      <Route path="/reservations/new" element={guard('reservations', <NewReservation state={state} actions={actions} />)} />
      <Route path="/rentals" element={guard('rentals', <Rentals state={state} actions={actions} />)} />
      <Route path="/payments" element={guard('payments', <Payments state={state} actions={actions} />)} />
      <Route path="/deliveries" element={guard('deliveries', <Deliveries state={state} actions={actions} currentUser={currentUser} />)} />
      <Route path="/returns" element={guard('returns', <Returns state={state} actions={actions} />)} />
      <Route path="/reports" element={guard('reports', <Reports state={state} />)} />
      <Route path="/users" element={guard('users', <UsersPage state={state} actions={actions} currentUser={currentUser} />)} />
      <Route path="/profile" element={<Profile currentUser={currentUser} actions={actions} />} />
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  )
}
