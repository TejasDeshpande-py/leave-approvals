export type Role = 'admin' | 'hr' | 'employee'
export type UserStatus = 'pending' | 'active' | 'disabled'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  status: UserStatus
}

export type UserBrief = Pick<User, 'id' | 'name' | 'email' | 'role'>
export type EmployeeBrief = UserBrief
export type RecipientSummary = Pick<User, 'name' | 'role'>

export interface RecipientOption extends RecipientSummary {
  recipient_key: string
}

export interface LeaveRequest {
  id: number
  employee: EmployeeBrief
  recipient: RecipientSummary
  leave_type: string
  start_date: string
  end_date: string
  submitted_body: string
  status: LeaveStatus
  reviewed_by: number | null
  reviewed_at: string | null
  review_comment: string | null
  created_at: string
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}