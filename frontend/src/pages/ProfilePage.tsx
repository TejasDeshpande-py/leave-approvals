import { useState, type FormEvent } from 'react'
import { useAuth } from '../app/auth/useAuth'
import { StatusBadge } from '../components/StatusBadge'
import { authApi } from '../features/auth/authApi'

export function ProfilePage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  if (!user) return null
  const initials = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation must match.')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password.')
      return
    }

    setSavingPassword(true)
    try {
      const response = await authApi.changePassword(currentPassword, newPassword, confirmNewPassword)
      setPasswordMessage(response.detail)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : 'Could not update password')
    } finally {
      setSavingPassword(false)
    }
  }

  return <div className="page-wrap">
    <header className="page-heading"><div><p className="eyebrow">Account</p><h1>My profile</h1><p>Your account details and workspace access.</p></div></header>
    <section className="panel profile-panel"><div className="profile-hero"><span className="avatar profile-avatar">{initials}</span><div><h2>{user.name}</h2><p>{user.email}</p></div></div><div className="profile-grid"><div className="profile-item"><span>Name</span><strong>{user.name}</strong></div><div className="profile-item"><span>Email</span><strong>{user.email}</strong></div><div className="profile-item"><span>Role</span><strong className="capitalize">{user.role}</strong></div><div className="profile-item"><span>Account</span><strong><StatusBadge status={user.status} /></strong></div></div></section>
    <section className="panel password-panel">
      <div className="password-panel-heading"><h2>Change password</h2><p>Choose a new password for your account.</p></div>
      {passwordError && <div className="alert" role="alert">{passwordError}</div>}
      {passwordMessage && <div className="alert success" role="status">{passwordMessage}</div>}
      <form onSubmit={changePassword}>
        <div className="password-fields">
          <div className="field"><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div>
          <div className="field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><span className="field-hint">At least 8 characters, with letters, a number, an uppercase letter, and a special character.</span></div>
          <div className="field"><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required /></div>
        </div>
        <div className="password-form-actions"><button className="primary-button" type="submit" disabled={savingPassword}>{savingPassword ? 'Updating password...' : 'Update password'}</button></div>
      </form>
    </section>
  </div>
}