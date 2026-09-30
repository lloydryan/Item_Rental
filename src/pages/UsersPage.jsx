import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '../components/Button'
import { DataTable } from '../components/DataTable'
import { Alert } from '../components/Feedback'
import { controlClasses } from '../components/Field'
import { ActionMenu, Dialog, MenuItem } from '../components/Overlay'
import { Page } from '../components/Page'
import { StatusBadge } from '../components/StatusBadge'
import { roles } from '../roles'

export function UsersPage({ state, actions, currentUser }) {
  const [selected, setSelected] = useState(null)
  const [role, setRole] = useState('rental')
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')

  function openRole(user) { setSelected(user); setRole(user.role); setError('') }
  async function updateRole() {
    setUpdating(true); setError('')
    try { await actions.updateProfileRole(selected.id, role); setSelected(null) } catch (updateError) { setError(updateError.message) } finally { setUpdating(false) }
  }

  return (
    <Page title="Users" eyebrow="Access management" description="Review employee accounts and manage application permissions.">
      <div className="rounded-lg border border-information-indicator/20 bg-information-soft px-4 py-3 text-sm text-information">Authentication accounts are created in Supabase. This page manages application roles and account visibility.</div>
      <DataTable title="Employees" columns={['User', 'Role', 'Status', 'Actions']} rows={state.users.map((user) => [<div key={user.id} className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{user.name.charAt(0).toUpperCase()}</span><div><strong className="block font-semibold text-gray-900">{user.name}</strong><span className="block text-xs text-gray-500">{user.email || 'Email managed in Authentication'}</span></div></div>, <span key={`${user.id}-role`} className="text-sm font-medium text-gray-700">{roles[user.role]}</span>, <StatusBadge key={`${user.id}-status`} status={user.active ? 'Active' : 'Inactive'} />, user.id === currentUser.id ? <span key={`${user.id}-self`} className="text-xs text-gray-400">Current user</span> : <ActionMenu key={`${user.id}-actions`} label={`Actions for ${user.name}`}><MenuItem onClick={() => openRole(user)}><ShieldCheck className="size-4" />Change role</MenuItem></ActionMenu>])} />
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title="Change employee role" description={selected ? `Update permissions for ${selected.name}.` : ''} size="sm" footer={<><Button variant="outline" type="button" onClick={() => setSelected(null)}>Cancel</Button><Button type="button" loading={updating} onClick={updateRole}>Save role</Button></>}><div className="grid gap-4"><Alert>{error}</Alert><label className="grid gap-1.5 text-sm font-medium text-gray-700">Application role<select className={controlClasses} value={role} onChange={(event) => setRole(event.target.value)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><p className="text-xs leading-5 text-gray-500">Changing a role immediately changes the pages and database operations this employee can access.</p></div></Dialog>
    </Page>
  )
}
