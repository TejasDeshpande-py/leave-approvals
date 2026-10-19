import { apiRequest, patchJson } from '../../shared/api/client'
import type { Page, Role, User, UserStatus } from '../../shared/types'

export const userApi = {
  list: (status?: UserStatus) => apiRequest<Page<User>>(`/admin/users?limit=100${status ? `&status=${status}` : ''}`),
  update: (id: number, values: { role?: Role; status?: 'active' | 'disabled' }) => patchJson<User>(`/admin/users/${id}`, values),
}