import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/ProtectedRoutes'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import * as database from './lib/database'
import { Button } from './components/Button'
import { Skeleton } from './components/Feedback'
import { useToast } from './components/toast-context'

const emptyState = {
  users: [], categories: [], items: [], customers: [], reservations: [],
  rentals: [], payments: [], deliveries: [], returns: [], inventoryMovements: [], stockAdjustments: [],
}

function SystemMessage({ title, message, action }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-sm" role="alert">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">LR Event Rental Services</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        {action}
      </section>
    </main>
  )
}

function AppSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-label="Loading application" aria-busy="true">
      <div className="grid min-h-screen lg:grid-cols-[16rem_1fr]">
        <Skeleton className="hidden rounded-none bg-sidebar lg:block" />
        <div className="min-w-0">
          <div className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6 lg:px-8"><div className="grid gap-1.5"><Skeleton className="h-2.5 w-20" /><Skeleton className="h-4 w-28" /></div><Skeleton className="size-9 rounded-full" /></div>
          <main className="mx-auto grid w-full max-w-[1440px] content-start gap-6 p-4 sm:p-6 lg:px-8 lg:py-7">
            <div className="grid gap-2 border-b border-border-subtle pb-5"><Skeleton className="h-2.5 w-32" /><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-96 max-w-full" /></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-40 sm:col-span-2" /><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.5fr)]"><Skeleton className="h-80" /><Skeleton className="h-72" /></div>
          </main>
        </div>
      </div>
    </div>
  )
}

function App() {
  const toast = useToast()
  const [state, setState] = useState(emptyState)
  const [currentUser, setCurrentUser] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [status, setStatus] = useState(isSupabaseConfigured ? 'loading' : 'configuration-error')
  const [error, setError] = useState('')

  const hydrate = useCallback(async (user, showLoading = true) => {
    if (showLoading) setStatus('loading')
    try {
      const data = await database.loadApplicationData(user)
      setAuthUser(user)
      setCurrentUser(data.currentUser)
      setState(data.state)
      setError('')
      setStatus('ready')
    } catch (loadError) {
      setAuthUser(user)
      setCurrentUser(null)
      setError(loadError.message)
      setStatus(['PROFILE_MISSING', 'PROFILE_INACTIVE'].includes(loadError.code) ? 'profile-error' : 'data-error')
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(sessionError.message)
        setStatus('data-error')
      } else if (data.session?.user) {
        hydrate(data.session.user)
      } else {
        setStatus('signed-out')
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setAuthUser(null)
        setCurrentUser(null)
        setState(emptyState)
        setStatus('signed-out')
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [hydrate])

  async function login(email, password) {
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) throw loginError
    await hydrate(data.user)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function runMutation(operation, successMessage) {
    const result = await operation()
    await hydrate(authUser, false)
    toast(successMessage)
    return result
  }

  const actions = {
    createCustomer: (form) => runMutation(() => database.createCustomer(form), 'Customer successfully created.'),
    createCategory: (form) => runMutation(() => database.createCategory(form), 'Item category successfully created.'),
    createItem: (form) => runMutation(() => database.createItem(form), 'Item successfully added.'),
    updateItem: (id, form, previousImageUrl) => runMutation(() => database.updateItem(id, form, previousImageUrl), 'Item successfully updated.'),
    adjustItemStock: (itemId, adjustmentType, quantity, reason) => runMutation(
      () => database.adjustItemStock(itemId, adjustmentType, quantity, reason),
      adjustmentType === 'Add' ? 'Stock successfully added.' : adjustmentType === 'Remove' ? 'Stock successfully removed.' : 'Unavailable stock successfully disposed.',
    ),
    startInventoryMovement: (form) => runMutation(() => database.startInventoryMovement(form), `${form.quantity} item(s) moved to ${form.movementType.toLowerCase()}.`),
    completeInventoryMovement: (id) => runMutation(() => database.completeInventoryMovement(id), 'Fixed items returned to available inventory.'),
    createUser: (form) => runMutation(() => database.createUser(form), 'Employee account successfully created.'),
    changePassword: (currentPassword, newPassword) => runMutation(() => database.changePassword(currentPassword, newPassword), 'Password successfully changed.'),
    createReservation: (form) => runMutation(() => database.createReservation(form, currentUser.id, state.items), 'Reservation successfully created.'),
    updateReservationStatus: (id, reservationStatus) => runMutation(() => database.updateReservationStatus(id, reservationStatus), reservationStatus === 'Cancelled' ? 'Reservation cancelled.' : 'Reservation confirmed.'),
    createRentalFromReservation: (id) => runMutation(() => database.createRentalFromReservation(id), 'Rental created and ready for payment.'),
    createPayment: (form) => runMutation(() => database.createPayment(form), 'Payment successfully recorded.'),
    updateRentalStatus: (id, rentalStatus) => runMutation(() => database.updateRentalStatus(id, rentalStatus), rentalStatus === 'Returned' ? 'Return sent to inventory for inspection.' : 'Rental status updated.'),
    updateDelivery: (id, patch) => runMutation(() => database.updateDelivery(id, patch), 'Delivery status updated.'),
    updateProfileRole: (id, role) => runMutation(() => database.updateProfileRole(id, role), 'Employee role updated.'),
    completeReturn: (id, inspection) => runMutation(() => database.completeReturn(id, inspection), 'Inspection completed and rental closed.'),
  }

  if (status === 'configuration-error') {
    return <SystemMessage title="Supabase is not configured" message="Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the development server." />
  }
  if (status === 'loading') {
    return <AppSkeleton />
  }
  if (status === 'profile-error') {
    return <SystemMessage title="Account access is not ready" message={error} action={<Button className="mt-5" variant="outline" type="button" onClick={logout}>Sign out</Button>} />
  }
  if (status === 'data-error') {
    return <SystemMessage title="We couldn't load the rental data" message={error} action={<Button className="mt-5" type="button" onClick={() => authUser ? hydrate(authUser) : setStatus('signed-out')}>Try again</Button>} />
  }

  return (
    <BrowserRouter>
      <AppRoutes
        state={state}
        actions={actions}
        currentUser={currentUser}
        onLogin={login}
        onLogout={logout}
      />
    </BrowserRouter>
  )
}

export default App
