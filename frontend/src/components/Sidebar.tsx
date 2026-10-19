import { ClipboardCheck, FilePlus2, Files, UserCog, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../app/auth/useAuth'

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
  const visibleItems = items.filter((item) => user && item.roles.includes(user.role))
  const initials = user?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return <>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={onNavigate} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div><p className="sidebar-label">Workspace</p><nav className="sidebar-nav" aria-label="Workspace navigation">
        {visibleItems.map(({ to, label, icon: Icon }) => <NavLink key={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} to={to} onClick={onNavigate}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></NavLink>)}
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