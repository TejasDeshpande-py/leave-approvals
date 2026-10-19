import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/auth/useAuth'
import { homePath } from '../app/homePath'
import { AuthStory } from '../components/AuthStory'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login(email, password)
      navigate(homePath(user.role), { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-page auth-page-login">
    <AuthStory />
    <section className="auth-card" aria-labelledby="login-title">
      <div className="auth-icon"><LockKeyhole size={20} /></div><h1 id="login-title">Welcome back</h1><p className="auth-intro">Sign in to your Leave Notes account.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="login-email">Work email</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@triconinfotech.com" required /></div>
        <div className="field"><label htmlFor="login-password">Password</label><div className="password-input-wrap"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
        <button className="primary-button full-width" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} /></button>
      </form>
      <p className="auth-footnote">New to Leave Notes? <Link to="/register">Create an account</Link></p><p className="auth-caption">Accounts require admin approval before first sign-in.</p>
    </section>
  </div>
}