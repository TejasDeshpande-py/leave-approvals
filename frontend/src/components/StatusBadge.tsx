import type { LeaveStatus, UserStatus } from '../shared/types'

export function StatusBadge({ status }: { status: LeaveStatus | UserStatus }) {
  return <span className={`status-badge ${status}`}>{status}</span>
}