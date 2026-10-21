import { apiRequest, patchJson, postJson } from '../../shared/api/client'
import type { LeaveRequest, LeaveStatus, Page, RecipientOption } from '../../shared/types'

export interface LeaveDraft {
  recipient_id: number
  leave_type: string
  start_date: string
  end_date: string
  body: string
  ai_body: string | null
  submitted_body: string
}

export interface LeaveNotePatch {
  body: string
  ai_body: string | null
  submitted_body: string
}

export const leaveApi = {
  recipients: () => apiRequest<RecipientOption[]>('/leaves/recipients'),
  rephrase: (body: string) => postJson<{ ai_body: string }>('/leaves/rephrase', { body }),
  submit: (draft: LeaveDraft) => postJson<LeaveRequest>('/leaves', draft),
  updateNote: (id: number, draft: LeaveNotePatch) => patchJson<LeaveRequest>(`/leaves/${id}`, draft),
  mine: (status?: LeaveStatus, offset = 0, limit = 50) => apiRequest<Page<LeaveRequest>>(`/leaves/me?limit=${limit}&offset=${offset}${status ? `&status=${status}` : ''}`),
  reviewList: (status?: LeaveStatus, offset = 0, limit = 50) => apiRequest<Page<LeaveRequest>>(`/leaves?limit=${limit}&offset=${offset}${status ? `&status=${status}` : ''}`),
  stats: () => apiRequest<Record<LeaveStatus, number>>('/leaves/stats'),
  decide: (id: number, status: 'approved' | 'rejected', comment?: string) => patchJson<LeaveRequest>(`/leaves/${id}/decision`, { status, comment: comment || null }),
}