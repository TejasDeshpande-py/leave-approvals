import { useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../../features/auth/authApi'
import { getAccessToken, setAccessToken } from '../../shared/api/client'
import type { User } from '../../shared/types'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()))

  useEffect(() => {
    let mounted = true
    if (!getAccessToken()) return () => { mounted = false }
    authApi.me()
      .then((currentUser) => { if (mounted) setUser(currentUser) })
      .catch(() => {
        setAccessToken(null)
        if (mounted) setUser(null)
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password)
    setAccessToken(response.access_token)
    try {
      const currentUser = await authApi.me()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      setAccessToken(null)
      throw error
    }
  }

  async function register(name: string, email: string, password: string) {
    const response = await authApi.register(name, email, password)
    return response.detail
  }

  function logout() {
    setAccessToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}
