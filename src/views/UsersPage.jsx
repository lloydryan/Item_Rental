import { useState } from 'react'
import { KeyRound, ShieldCheck, UserPlus } from 'lucide-react'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert, Notice } from '../components/Feedback'
import { Field, SelectField } from '../components/Field'
import { ActionMenu, Dialog, MenuItem } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { roles } from '../roles'

const emptyUser = { fullName: '', email: '', password: '', role: 'rental' }

export function UsersPage({ state, actions, currentUser }) {
  const [selected, setSelected] = useState(null)
  const [resetUser, setResetUser] = useState(null)
  const [role, setRole] = useState('rental')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyUser)
  const [updating, setUpdating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')

  function openRole(user) { setSelected(user); setRole(user.role); setError('') }

  async function updateRole() {
    setUpdating(true); setError('')
    try { await actions.updateProfileRole(selected.id, role); setSelected(null) } catch (updateError) { setError(updateError.message) } finally { setUpdating(false) }
  }

  async function createUser(event) {
    event.preventDefault()
    setCreating(true); setError('')
    try {
      await actions.createUser(form)
      setForm(emptyUser)
      setCreateOpen(false)
    } catch (createError) {
      setError(createError.message)
    } finally {
      setCreating(false)
    }
  }

  function openPasswordReset(user) {
    setResetUser(user)
    setPasswordForm({ password: '', confirmPassword: '' })
    setError('')
  }

  function closePasswordReset() {
    if (resetting) return
    setResetUser(null)
    setPasswordForm({ password: '', confirmPassword: '' })
    setError('')
  }

  async function resetPassword(event) {
    event.preventDefault()
    setError('')
    if (passwordForm.password.length < 8) {
      setError('The temporary password must contain at least 8 characters.')
      return
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('The temporary password and confirmation do not match.')
      return
    }

    setResetting(true)
    try {
      await actions.resetUserPassword(resetUser.id, passwordForm.password)
      setResetUser(null)
      setPasswordForm({ password: '', confirmPassword: '' })
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <Page title="Users" eyebrow="Access management" description="Create employee login accounts and manage application permissions." actions={<Button type="button" onClick={() => { setError(''); setCreateOpen(true) }}><UserPlus className="size-4" />Add user</Button>}>
      <Notice>New employees receive a real Supabase Authentication account and an application role. Share the temporary password through a secure channel.</Notice>
      <DataTable title="Employees" columns={['User', 'Role', 'Status', 'Actions']} rows={state.users.map((user) => [<div key={user.id} className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span><div><strong className="block font-semibold text-foreground">{user.name}</strong><span className="block text-xs text-muted-foreground">{user.email || 'Email unavailable for this existing account'}</span></div></div>, <span key={`${user.id}-role`} className="text-sm font-medium text-foreground">{roles[user.role]}</span>, <StatusBadge key={`${user.id}-status`} status={user.active ? 'Active' : 'Inactive'} />, user.id === currentUser.id ? <span key={`${user.id}-self`} className="text-xs text-subtle-foreground">Current user</span> : <ActionMenu key={`${user.id}-actions`} label={`Actions for ${user.name}`}><MenuItem onClick={() => openPasswordReset(user)}><KeyRound className="size-4" />Reset password</MenuItem><MenuItem onClick={() => openRole(user)}><ShieldCheck className="size-4" />Change role</MenuItem></ActionMenu>])} />

      <Dialog open={createOpen} onClose={() => { if (!creating) setCreateOpen(false) }} title="Create employee account" description="Create the authentication login and assign its initial access role." footer={<><Button variant="outline" type="button" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button><Button type="submit" form="create-user-form" loading={creating}><UserPlus className="size-4" />Create user</Button></>}>
        <form id="create-user-form" className="grid gap-4" onSubmit={createUser}>
          <Alert>{error}</Alert>
          <Field label="Full name" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} autoComplete="name" required />
          <Field label="Email address" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} autoComplete="email" required />
          <Field label="Temporary password" type="password" minLength="8" value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="new-password" helper="Use at least 8 characters. The account is confirmed immediately." required />
          <SelectField label="Application role" value={form.role} onChange={(role) => setForm({ ...form, role })}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField>
        </form>
      </Dialog>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title="Change employee role" description={selected ? `Update permissions for ${selected.name}.` : ''} size="sm" footer={<><Button variant="outline" type="button" onClick={() => setSelected(null)}>Cancel</Button><Button type="button" loading={updating} onClick={updateRole}>Save role</Button></>}><div className="grid gap-4"><Alert>{error}</Alert><SelectField label="Application role" value={role} onChange={setRole} helper="Changing a role immediately changes the pages and database operations this employee can access.">{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectField></div></Dialog>

      <Dialog open={Boolean(resetUser)} onClose={closePasswordReset} title="Reset employee password" description={resetUser ? `Set a temporary password for ${resetUser.name}.` : ''} size="sm" footer={<><Button variant="outline" type="button" onClick={closePasswordReset} disabled={resetting}>Cancel</Button><Button type="submit" form="reset-password-form" loading={resetting}><KeyRound className="size-4" />Reset password</Button></>}>
        <form id="reset-password-form" className="grid gap-4" onSubmit={resetPassword}>
          <Alert>{error}</Alert>
          <Notice>Share the temporary password securely. The employee should change it from My profile after signing in.</Notice>
          <Field label="Temporary password" type="password" minLength="8" value={passwordForm.password} onChange={(password) => setPasswordForm({ ...passwordForm, password })} autoComplete="new-password" helper="Use at least 8 characters." required />
          <Field label="Confirm temporary password" type="password" minLength="8" value={passwordForm.confirmPassword} onChange={(confirmPassword) => setPasswordForm({ ...passwordForm, confirmPassword })} autoComplete="new-password" required />
        </form>
      </Dialog>
    </Page>
  )
}
