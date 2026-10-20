import { apiRequest, patchJson, postJson } from '../../shared/api/client'
import type { User } from '../../shared/types'

interface TokenResponse {
  access_token: string
  access_token_expires_in: number
  token_type: string
}

export interface SessionResponse extends User {
  access_token: string
}

interface MessageResponse {
  detail: string
}

export const authApi = {
  login: (email: string, password: string) => postJson<TokenResponse>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => postJson<MessageResponse>('/auth/register', { name, email, password }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<SessionResponse>('/auth/me'),
  changePassword: (current_password: string, new_password: string, confirm_new_password: string) =>
    patchJson<MessageResponse>('/auth/password', { current_password, new_password, confirm_new_password }),
}