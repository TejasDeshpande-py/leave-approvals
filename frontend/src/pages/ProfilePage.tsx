import { useAuth } from '../app/auth/useAuth'
import { StatusBadge } from '../components/StatusBadge'

export function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  const initials = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return <div className="page-wrap">
    <header className="page-heading"><div><p className="eyebrow">Account</p><h1>My profile</h1><p>Your account details and workspace access.</p></div></header>
    <section className="panel profile-panel"><div className="profile-hero"><span className="avatar profile-avatar">{initials}</span><div><h2>{user.name}</h2><p>{user.email}</p></div></div><div className="profile-grid"><div className="profile-item"><span>Name</span><strong>{user.name}</strong></div><div className="profile-item"><span>Email</span><strong>{user.email}</strong></div><div className="profile-item"><span>Role</span><strong className="capitalize">{user.role}</strong></div><div className="profile-item"><span>Account</span><strong><StatusBadge status={user.status} /></strong></div></div></section>
  </div>
}