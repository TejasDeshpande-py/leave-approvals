import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Sidebar } from '../components/Sidebar'

export function WorkspaceLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  return <div className="workspace"><AppHeader onMenu={() => setMenuOpen((open) => !open)} /><div className="shell-body"><Sidebar open={menuOpen} onNavigate={closeMenu} /><main className="content-area"><Outlet /></main></div></div>
}