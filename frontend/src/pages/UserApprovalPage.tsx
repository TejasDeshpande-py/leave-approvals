import { useEffect, useState } from 'react'
import { Check, UserRoundCheck, X } from 'lucide-react'
import { ChevronSelect } from '../components/ChevronSelect'
import { StatusBadge } from '../components/StatusBadge'
import { userApi } from '../features/users/userApi'
import type { Role, User, UserStatus } from '../shared/types'

const filters: Array<{ label: string; value?: UserStatus }> = [{ label: 'Pending', value: 'pending' }, { label: 'Active', value: 'active' }, { label: 'Disabled', value: 'disabled' }, { label: 'All' }]

export function UserApprovalPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Record<number, Role>>({})
  const [filter, setFilter] = useState<UserStatus | undefined>('pending')
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    userApi.list(filter)
      .then((page) => { if (active) { setUsers(page.items); setRoles(Object.fromEntries(page.items.map((user) => [user.id, user.role]))) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load users') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, refresh])

  async function updateUser(user: User, approve: boolean) {
    setBusyId(user.id)
    setError('')
    try {
      const role = roles[user.id] ?? user.role
      const changes = user.status === 'pending'
        ? approve ? { role, status: 'active' as const } : { status: 'disabled' as const }
        : { role }
      await userApi.update(user.id, changes)
      setLoading(true)
      setRefresh((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update user')
    } finally {
      setBusyId(null)
    }
  }

  return <div className="page-wrap">
    <header className="page-heading"><div><p className="eyebrow">Access control</p><h1>User approvals</h1><p>Set each person’s role and approve or disable their account.</p></div></header>
    <div className="filter-bar"><div className="segmented" aria-label="Filter users by account status">{filters.map(({ label, value }) => <button key={label} type="button" aria-pressed={filter === value} onClick={() => { setLoading(true); setError(''); setFilter(value) }}>{label}</button>)}</div><span className="helper-copy">{users.length} users</span></div>
    {error && <div className="alert" role="alert">{error}</div>}
    {loading ? <div className="panel loading-state">Loading users...</div> : users.length === 0 ? <div className="panel empty-state"><UserRoundCheck size={26} /><h2>No users in this view</h2><p>New registrations appear here with pending status.</p></div> : <div className="panel data-table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Account</th><th>Role</th><th>Action</th></tr></thead><tbody>{users.map((user) => {
      const selectedRole = roles[user.id] ?? user.role
      const roleChanged = selectedRole !== user.role
      return <tr key={user.id}><td><span className="table-primary">{user.name}</span><span className="table-secondary">{user.email}</span></td><td><StatusBadge status={user.status} /></td><td><ChevronSelect className="table-select" value={selectedRole} onChange={(event) => setRoles((current) => ({ ...current, [user.id]: event.target.value as Role }))} aria-label={`Role for ${user.name}`}><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></ChevronSelect></td><td><div className="table-actions">{user.status === 'pending' ? <><button className="primary-button compact-button" type="button" disabled={busyId === user.id} onClick={() => updateUser(user, true)}><Check size={14} />{roleChanged ? 'Approve & save' : 'Approve'}</button><button className="danger-button compact-button" type="button" disabled={busyId === user.id} onClick={() => updateUser(user, false)}><X size={14} />Reject</button></> : <button className="secondary-button compact-button" type="button" disabled={busyId === user.id || !roleChanged} onClick={() => updateUser(user, true)}>Save role</button>}</div></td></tr>
    })}</tbody></table></div>}
  </div>
}