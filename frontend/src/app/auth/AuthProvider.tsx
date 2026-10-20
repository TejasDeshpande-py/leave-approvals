import { useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../../features/auth/authApi'
import { clearLegacyTokens, setAccessToken } from '../../shared/api/client'
import type { User } from '../../shared/types'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setAccessToken(null)
    clearLegacyTokens()
    const handleAuthExpired = () => setUser(null)
    window.addEventListener('leave-office-auth-expired', handleAuthExpired)
    authApi.me()
      .then((session) => {
        if (mounted) {
          setAccessToken(session.access_token)
          setUser(session)
        }
      })
      .catch(() => {
        if (mounted) {
          setAccessToken(null)
          setUser(null)
        }
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => {
      mounted = false
      window.removeEventListener('leave-office-auth-expired', handleAuthExpired)
    }
  }, [])

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password)
    setAccessToken(response.access_token)
    try {
      const session = await authApi.me()
      setAccessToken(session.access_token)
      setUser(session)
      return session
    } catch (error) {
      setAccessToken(null)
      throw error
    }
  }

  async function register(name: string, email: string, password: string) {
    const response = await authApi.register(name, email, password)
    return response.detail
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setAccessToken(null)
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}
