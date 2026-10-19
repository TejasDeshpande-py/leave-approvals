import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../app/auth/useAuth'
import { AuthStory } from '../components/AuthStory'

export function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (email.trim().toLowerCase().split('@').pop() !== 'triconinfotech.com') {
      setError('Email must use the @triconinfotech.com domain.')
      return
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
      setError('Password must be at least 8 characters and include letters, a number, an uppercase letter, and a special character.')
      return
    }
    setBusy(true)
    try {
      setMessage(await register(name, email, password))
      setName('')
      setEmail('')
      setPassword('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to register')
    } finally {
      setBusy(false)
    }
  }

  return <div className="auth-page auth-page-register">
    <AuthStory register />
    <section className="auth-card register-card" aria-labelledby="register-title">
      <div className="auth-icon"><UserRoundPlus size={20} /></div><h1 id="register-title">Get started</h1><p className="auth-intro">Create your account to continue.</p>
      {error && <div className="alert" role="alert">{error}</div>}{message && <div className="alert success" role="status">{message}</div>}
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="register-name">Full name</label><input id="register-name" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required /></div>
        <div className="field"><label htmlFor="register-email">Work email</label><input id="register-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@triconinfotech.com" required /><span className="field-hint">Use your @triconinfotech.com email.</span></div>
        <div className="field"><label htmlFor="register-password">Password</label><div className="password-input-wrap"><input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><span className="field-hint">At least 8 characters, with letters, a number, an uppercase letter, and a special character.</span></div>
        <button className="primary-button full-width" type="submit" disabled={busy}>{busy ? 'Sending request...' : 'Create account'} <ArrowRight size={16} /></button>
      </form>
      <p className="auth-footnote">Already have an account? <Link to="/login">Sign in</Link></p>
    </section>
  </div>
}