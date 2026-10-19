import { createContext } from 'react'
import type { User } from '../../shared/types'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<string>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)