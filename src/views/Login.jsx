import { useState } from 'react'
import { Eye, EyeOff, KeyRound, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { useNavigate } from '../lib/navigation'
import { Button } from '../components/Button'
import { Alert } from '../components/Feedback'
import { controlClasses } from '../components/Field'

export function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await onLogin(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in. Check your email and password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary"><PackageCheck className="size-6" /></span><div><strong className="block text-base">LR Event Rental</strong><span className="text-sm text-sidebar-muted">Operations management</span></div></div>
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary-accent">One connected workspace</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">Keep every rental moving, from reservation to return.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-sidebar-muted">Manage inventory availability, payments, delivery schedules, and item inspections with accurate live records.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-8 text-sm text-sidebar-muted">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary-accent" />Secure roles</span>
            <span className="flex items-center gap-2"><Truck className="size-4 text-primary-accent" />Live workflow</span>
            <span className="flex items-center gap-2"><KeyRound className="size-4 text-primary-accent" />Protected data</span>
          </div>
        </div>
        <p className="relative text-xs text-sidebar-muted/70">LR Event Rental Services · Davao City</p>
      </section>

      <section className="grid min-w-0 min-h-screen place-items-center px-5 py-10 sm:px-8 lg:min-h-0">
        <div className="min-w-0 w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><PackageCheck className="size-5" /></span><div><strong className="block text-sm">LR Event Rental</strong><span className="text-xs text-muted-foreground">Operations management</span></div></div>
          <p className="text-sm font-semibold text-primary">Staff portal</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in with your authorized staff account to continue.</p>

          <form className="mt-8 grid min-w-0 gap-5" onSubmit={submit}>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">Email address<span className="sr-only"> required</span><input className={controlClasses} type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="grid min-w-0 gap-1.5 text-sm font-medium text-foreground">Password<span className="relative block min-w-0"><input className={`${controlClasses} pr-11`} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-subtle-foreground hover:bg-muted hover:text-foreground" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>
            <Alert>{error}</Alert>
            <Button className="w-full" size="lg" type="submit" loading={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">Access is limited according to your assigned employee role.</p>
        </div>
      </section>
    </main>
  )
}
