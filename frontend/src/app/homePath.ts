import type { Role } from '../shared/types'

export function homePath(role: Role) {
  if (role === 'admin') return '/users'
  if (role === 'hr') return '/review'
  return '/request'
}