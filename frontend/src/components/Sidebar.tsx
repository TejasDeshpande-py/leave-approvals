import { useEffect, useState } from 'react'
import { ClipboardCheck, FilePlus2, Files, UserCog, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../app/auth/useAuth'
import { leaveApi } from '../features/leaves/leaveApi'
import { userApi } from '../features/users/userApi'
import { APPROVAL_COUNTS_UPDATED } from '../shared/approvalCounts'
import type { LeaveStatus, UserStatus } from '../shared/types'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: string[]
}

const items: NavItem[] = [
  { to: '/request', label: 'Write a request', icon: FilePlus2, roles: ['employee', 'hr', 'admin'] },
  { to: '/mine', label: 'My requests', icon: Files, roles: ['employee', 'hr', 'admin'] },
  { to: '/review', label: 'Review inbox', icon: ClipboardCheck, roles: ['hr', 'admin'] },
  { to: '/users', label: 'User approvals', icon: UserCog, roles: ['admin'] },
]

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [reviewCount, setReviewCount] = useState<number | null>(null)
  const [reviewCountError, setReviewCountError] = useState(false)
  const [userApprovalCount, setUserApprovalCount] = useState<number | null>(null)
  const [userApprovalCountError, setUserApprovalCountError] = useState(false)
  const visibleItems = items.filter((item) => user && item.roles.includes(user.role))
  const initials = user?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    let active = true
    const refreshCounts = () => {
      if (user && ['hr', 'admin'].includes(user.role)) {
        leaveApi.stats()
          .then((counts: Record<LeaveStatus, number>) => {
            if (active) { setReviewCount(counts.pending); setReviewCountError(false) }
          })
          .catch(() => {
            if (active) { setReviewCount(null); setReviewCountError(true) }
          })
      } else {
        setReviewCount(null)
        setReviewCountError(false)
      }

      if (user?.role === 'admin') {
        userApi.stats()
          .then((counts: Record<UserStatus, number>) => {
            if (active) { setUserApprovalCount(counts.pending); setUserApprovalCountError(false) }
          })
          .catch(() => {
            if (active) { setUserApprovalCount(null); setUserApprovalCountError(true) }
          })
      } else {
        setUserApprovalCount(null)
        setUserApprovalCountError(false)
      }
    }

    refreshCounts()
    window.addEventListener(APPROVAL_COUNTS_UPDATED, refreshCounts)
    return () => {
      active = false
      window.removeEventListener(APPROVAL_COUNTS_UPDATED, refreshCounts)
    }
  }, [pathname, user])

  const countFor = (to: string) => to === '/review'
    ? { count: reviewCount, error: reviewCountError }
    : to === '/users'
      ? { count: userApprovalCount, error: userApprovalCountError }
      : null

  return <>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={onNavigate} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div><p className="sidebar-label">Workspace</p><nav className="sidebar-nav" aria-label="Workspace navigation">
        {visibleItems.map(({ to, label, icon: Icon }) => {
          const pending = countFor(to)
          return <NavLink key={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} to={to} onClick={onNavigate} aria-label={pending?.count !== null && pending?.count !== undefined ? `${label}, ${pending.count} pending` : label}>
            <Icon size={17} strokeWidth={1.8} /><span className="sidebar-link-label">{label}</span>
            {pending && <span className={`sidebar-count${pending.error ? ' count-error' : ''}`} aria-hidden="true" title={pending.error ? 'Pending count unavailable' : `${pending.count ?? 0} pending`}>
              {pending.error ? '!' : pending.count ?? '…'}
            </span>}
          </NavLink>
        })}
      </nav></div>
      <div className="sidebar-footer">
        {user && <NavLink className={({ isActive }) => `sidebar-profile${isActive ? ' active' : ''}`} to="/profile" onClick={onNavigate} aria-label={`Open ${user.name}'s profile`}>
          <span className="avatar">{initials || 'U'}</span>
          <span className="sidebar-profile-copy"><strong>{user.name}</strong><small>{user.role} · My profile</small></span>
        </NavLink>}
      </div>
    </aside>
  </>
}