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
  rentals: [], payments: [], deliveries: [], returns: [],
}

function SystemMessage({ title, message, action }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm" role="alert">
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
    <div className="min-h-screen bg-background p-4 sm:p-6" aria-label="Loading application">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="hidden min-h-[calc(100vh-3rem)] lg:block" />
        <div className="grid content-start gap-6">
          <div className="flex items-center justify-between rounded-xl border bg-card p-5"><div className="grid gap-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-7 w-48" /></div><Skeleton className="size-10" /></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-36 sm:col-span-2" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
          <Skeleton className="h-80" />
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
    await operation()
    await hydrate(authUser, false)
    toast(successMessage)
  }

  const actions = {
    createCustomer: (form) => runMutation(() => database.createCustomer(form), 'Customer successfully created.'),
    createItem: (form) => runMutation(() => database.createItem(form), 'Item successfully added.'),
    createReservation: (form) => runMutation(() => database.createReservation(form, currentUser.id, state.items), 'Reservation successfully created.'),
    createPayment: (form) => runMutation(() => database.createPayment(form), 'Payment successfully recorded.'),
    updateRentalStatus: (id, rentalStatus) => runMutation(() => database.updateRentalStatus(id, rentalStatus), 'Rental status updated.'),
    updateDelivery: (id, patch) => runMutation(() => database.updateDelivery(id, patch), 'Delivery status updated.'),
    updateProfileRole: (id, role) => runMutation(() => database.updateProfileRole(id, role), 'Employee role updated.'),
    completeReturn: (id) => runMutation(() => database.completeReturn(id), 'Return inspection completed.'),
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
