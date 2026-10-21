import { useCallback, useState } from 'react'
import { Check, UserRoundCheck, X } from 'lucide-react'
import { ChevronSelect } from '../components/ChevronSelect'
import { StatusBadge } from '../components/StatusBadge'
import { userApi } from '../features/users/userApi'
import { APPROVAL_COUNTS_UPDATED } from '../shared/approvalCounts'
import type { Role, User, UserStatus } from '../shared/types'
import { useInfinitePage } from '../shared/useInfinitePage'

const filters: Array<{ label: string; value?: UserStatus }> = [{ label: 'Pending', value: 'pending' }, { label: 'Active', value: 'active' }, { label: 'Disabled', value: 'disabled' }, { label: 'All' }]

export function UserApprovalPage() {
  const [refresh, setRefresh] = useState(0)
  const [roleOverrides, setRoleOverrides] = useState<Record<number, Role>>({})
  const [filter, setFilter] = useState<UserStatus | undefined>('pending')
  const [busyId, setBusyId] = useState<number | null>(null)
  const loadPage = useCallback((offset: number, limit: number) => userApi.list(filter, offset, limit), [filter])
  const { items: users, total, loading, loadingMore, hasMore, error, setError, sentinelRef } = useInfinitePage(loadPage, `${filter ?? 'all'}:${refresh}`)
  const roles = Object.fromEntries(users.map((user) => [user.id, roleOverrides[user.id] ?? user.role]))

  async function updateUser(user: User, approve: boolean) {
    setBusyId(user.id)
    setError('')
    try {
      const role = roles[user.id] ?? user.role
      const changes = user.status === 'pending'
        ? approve ? { role, status: 'active' as const } : { status: 'disabled' as const }
        : { role }
      await userApi.update(user.id, changes)
      setRoleOverrides((current) => {
        const next = { ...current }
        delete next[user.id]
        return next
      })
      window.dispatchEvent(new Event(APPROVAL_COUNTS_UPDATED))
      setRefresh((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update user')
    } finally {
      setBusyId(null)
    }
  }

  return <div className="page-wrap">
    <header className="page-heading"><div><p className="eyebrow">Access control</p><h1>User approvals</h1><p>Set each person’s role and approve or disable their account.</p></div></header>
    <div className="filter-bar"><div className="segmented" aria-label="Filter users by account status">{filters.map(({ label, value }) => <button key={label} type="button" aria-pressed={filter === value} onClick={() => { setError(''); setFilter(value) }}>{label}</button>)}</div><span className="helper-copy">{total} users</span></div>
    {error && <div className="alert" role="alert">{error}</div>}
    {loading ? <div className="panel loading-state">Loading users...</div> : users.length === 0 ? <div className="panel empty-state"><UserRoundCheck size={26} /><h2>No users in this view</h2><p>New registrations appear here with pending status.</p></div> : <div className="panel data-table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Account</th><th>Role</th><th>Action</th></tr></thead><tbody>{users.map((user) => {
      const selectedRole = roles[user.id] ?? user.role
      const roleChanged = selectedRole !== user.role
      return       <tr key={user.id}><td><span className="table-primary">{user.name}</span><span className="table-secondary">{user.email}</span></td><td><StatusBadge status={user.status} /></td><td><ChevronSelect className="table-select" value={selectedRole} onChange={(event) => setRoleOverrides((current) => ({ ...current, [user.id]: event.target.value as Role }))} aria-label={`Role for ${user.name}`}><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></ChevronSelect></td><td><div className="table-actions">{user.status === 'pending' ? <><button className="primary-button compact-button" type="button" disabled={busyId === user.id} onClick={() => updateUser(user, true)}><Check size={14} />{roleChanged ? 'Approve & save' : 'Approve'}</button><button className="danger-button compact-button" type="button" disabled={busyId === user.id} onClick={() => updateUser(user, false)}><X size={14} />Reject</button></> : <button className="secondary-button compact-button" type="button" disabled={busyId === user.id || !roleChanged} onClick={() => updateUser(user, true)}>Save role</button>}</div></td></tr>
    })}</tbody></table></div>}
    {hasMore && <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />}
    {loadingMore && <p className="helper-copy scroll-status" role="status">Loading more users...</p>}
  </div>
}