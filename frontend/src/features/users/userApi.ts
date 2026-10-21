import { apiRequest, patchJson } from '../../shared/api/client'
import type { Page, Role, User, UserStatus } from '../../shared/types'

export const userApi = {
  list: (status?: UserStatus, offset = 0, limit = 50) => apiRequest<Page<User>>(`/admin/users?limit=${limit}&offset=${offset}${status ? `&status=${status}` : ''}`),
  stats: () => apiRequest<Record<UserStatus, number>>('/admin/users/stats'),
  update: (id: number, values: { role?: Role; status?: 'active' | 'disabled' }) => patchJson<User>(`/admin/users/${id}`, values),
}