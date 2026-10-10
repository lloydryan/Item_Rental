'use client'

import { lazy, Suspense } from 'react'
import { useApp } from '../app-context'
import { Skeleton } from '../components/Feedback'

const pages = {
  dashboard: lazy(() => import('../views/Dashboard').then((module) => ({ default: module.Dashboard }))),
  customers: lazy(() => import('../views/Customers').then((module) => ({ default: module.Customers }))),
  items: lazy(() => import('../views/Items').then((module) => ({ default: module.Items }))),
  inventoryMovements: lazy(() => import('../views/InventoryMovements').then((module) => ({ default: module.InventoryMovements }))),
  maintenance: lazy(() => import('../views/Maintenance').then((module) => ({ default: module.Maintenance }))),
  reservations: lazy(() => import('../views/Reservations').then((module) => ({ default: module.Reservations }))),
  newReservation: lazy(() => import('../views/NewReservation').then((module) => ({ default: module.NewReservation }))),
  rentals: lazy(() => import('../views/Rentals').then((module) => ({ default: module.Rentals }))),
  payments: lazy(() => import('../views/Payments').then((module) => ({ default: module.Payments }))),
  deliveries: lazy(() => import('../views/Deliveries').then((module) => ({ default: module.Deliveries }))),
  returns: lazy(() => import('../views/Returns').then((module) => ({ default: module.Returns }))),
  reports: lazy(() => import('../views/Reports').then((module) => ({ default: module.Reports }))),
  users: lazy(() => import('../views/UsersPage').then((module) => ({ default: module.UsersPage }))),
  profile: lazy(() => import('../views/Profile').then((module) => ({ default: module.Profile }))),
  login: lazy(() => import('../views/Login').then((module) => ({ default: module.Login }))),
}

function RouteSkeleton() {
  return <div className="grid gap-6" aria-label="Loading page"><div className="grid gap-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-8 w-56" /></div><Skeleton className="h-80 w-full" /></div>
}

export function RoutePage({ name }) {
  const app = useApp()
  const Component = pages[name]
  const props = name === 'login' ? { onLogin: app.onLogin }
    : name === 'profile' ? { currentUser: app.currentUser, actions: app.actions }
      : { state: app.state, actions: app.actions, currentUser: app.currentUser }
  return <Suspense fallback={<RouteSkeleton />}><Component {...props} /></Suspense>
}
