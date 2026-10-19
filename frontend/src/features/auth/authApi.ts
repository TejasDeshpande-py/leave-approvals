import { apiRequest, postJson } from '../../shared/api/client'
import type { User } from '../../shared/types'

interface TokenResponse {
  access_token: string
  token_type: string
}

interface MessageResponse {
  detail: string
}

export const authApi = {
  login: (email: string, password: string) => postJson<TokenResponse>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => postJson<MessageResponse>('/auth/register', { name, email, password }),
  me: () => apiRequest<User>('/auth/me'),
}