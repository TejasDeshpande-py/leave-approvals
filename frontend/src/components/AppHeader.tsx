import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../app/auth/useAuth'

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { logout } = useAuth()
  return (
    <header className="topbar">
      <div className="topbar-start">
        <button className="nav-toggle mobile-only" type="button" onClick={onMenu} aria-label="Open navigation"><Menu size={19} /></button>
        <div className="brand-lockup workspace-brand"><span className="brand-mark">LO</span><span>Leave Office<small>PEOPLE OPERATIONS</small></span></div>
      </div>
      <div className="topbar-end">
        <button className="icon-button signout-button" type="button" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={16} /><span>Logout</span></button>
      </div>
    </header>
  )
}