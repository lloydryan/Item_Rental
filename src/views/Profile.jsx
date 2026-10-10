import { useState } from 'react'
import { KeyRound, UserRound } from 'lucide-react'
import { Button } from '../components/Button'
import { Alert } from '../components/Feedback'
import { Field } from '../components/Field'
import { Page } from '../components/Page'
import { roles } from '../roles'

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function Profile({ currentUser, actions }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function changePassword(event) {
    event.preventDefault()
    setError('')

    if (form.newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('The new password and confirmation do not match.')
      return
    }
    if (form.currentPassword === form.newPassword) {
      setError('Choose a new password that is different from your current password.')
      return
    }

    setSaving(true)
    try {
      await actions.changePassword(form.currentPassword, form.newPassword)
      setForm(emptyForm)
    } catch (changeError) {
      setError(changeError.message || 'We could not change your password. Check your current password and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page title="My profile" eyebrow="Account" description="Review your account details and manage your sign-in password.">
      <div className="grid max-w-4xl gap-6 lg:grid-cols-[17rem_1fr]">
        <section className="h-fit rounded-xl border bg-card p-5 shadow-xs" aria-labelledby="profile-details-heading">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><UserRound className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id="profile-details-heading" className="truncate font-semibold text-foreground">{currentUser.name}</h2>
              <p className="truncate text-sm text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>
          <dl className="mt-5 border-t pt-4">
            <div className="grid gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">Application role</dt>
              <dd className="text-sm font-medium text-foreground">{roles[currentUser.role]}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border bg-card shadow-xs" aria-labelledby="password-heading">
          <div className="flex items-start gap-3 border-b px-5 py-4 sm:px-6">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><KeyRound className="size-4" aria-hidden="true" /></span>
            <div>
              <h2 id="password-heading" className="font-semibold text-foreground">Change password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Replace your temporary or existing password with one only you know.</p>
            </div>
          </div>
          <form className="grid gap-4 p-5 sm:p-6" onSubmit={changePassword}>
            <Alert>{error}</Alert>
            <Field label="Current password" type="password" value={form.currentPassword} onChange={(currentPassword) => setForm({ ...form, currentPassword })} autoComplete="current-password" required />
            <Field label="New password" type="password" minLength="8" value={form.newPassword} onChange={(newPassword) => setForm({ ...form, newPassword })} autoComplete="new-password" helper="Use at least 8 characters." required />
            <Field label="Confirm new password" type="password" minLength="8" value={form.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} autoComplete="new-password" required />
            <div className="flex justify-end border-t pt-4">
              <Button type="submit" loading={saving}>Change password</Button>
            </div>
          </form>
        </section>
      </div>
    </Page>
  )
}
