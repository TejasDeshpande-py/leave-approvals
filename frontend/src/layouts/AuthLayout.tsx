import { ArrowRight, Leaf } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export function AuthLayout() {
  const isRegister = useLocation().pathname === '/register'
  return <main className="auth-scene">
    <header className="auth-header">
      <Link className="brand-lockup" to="/login"><span className="brand-mark"><Leaf size={17} /></span><span>Leave Office</span></Link>
      <nav className="auth-links" aria-label="Account navigation"><Link className="auth-action" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Login' : 'Register'} <ArrowRight size={14} /></Link></nav>
    </header>
    <div className="auth-content"><Outlet /></div>
    <span className="auth-credit">TRICON INFOTECH · PEOPLE OPERATIONS</span>
  </main>
}