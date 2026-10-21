import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import { useAuth } from '../app/auth/useAuth'
import { LeaveDetailsDialog } from '../components/LeaveDetailsDialog'
import { StatusBadge } from '../components/StatusBadge'
import { leaveApi } from '../features/leaves/leaveApi'
import { APPROVAL_COUNTS_UPDATED } from '../shared/approvalCounts'
import type { LeaveRequest, LeaveStatus } from '../shared/types'
import { useInfinitePage } from '../shared/useInfinitePage'

const filters: Array<{ label: string; value?: LeaveStatus }> = [{ label: 'All' }, { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }]
const dateRange = (request: LeaveRequest) => `${new Date(`${request.start_date}T00:00:00`).toLocaleDateString()} – ${new Date(`${request.end_date}T00:00:00`).toLocaleDateString()}`

export function ReviewPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Record<LeaveStatus, number> | null>(null)
  const [filter, setFilter] = useState<LeaveStatus | undefined>('pending')
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [decision, setDecision] = useState<{ id: number; action: 'approved' | 'rejected' } | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const loadPage = useCallback((offset: number, limit: number) => leaveApi.reviewList(filter, offset, limit), [filter])
  const { items, total, loading, loadingMore, hasMore, error, setError, sentinelRef } = useInfinitePage(loadPage, `${filter ?? 'all'}:${refresh}`)

  function chooseFilter(value?: LeaveStatus) {
    if (value === filter) return
    setError('')
    setFilter(value)
  }

  useEffect(() => {
    let active = true
    leaveApi.stats()
      .then((counts) => { if (active) setStats(counts) })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load review counts')
      })
    return () => { active = false }
  }, [refresh, setError])

  async function decide() {
    if (!decision) return
    setError('')
    setSaving(true)
    try {
      await leaveApi.decide(decision.id, decision.action, comment.trim() || undefined)
      window.dispatchEvent(new Event(APPROVAL_COUNTS_UPDATED))
      setDecision(null)
      setComment('')
      setRefresh((value) => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update leave request')
    } finally {
      setSaving(false)
    }
  }

  return <div className="page-wrap">
    <header className="page-heading"><div><p className="eyebrow">{user?.role === 'admin' ? 'All recipients' : 'Assigned to you'}</p><h1>Review inbox</h1><p>Read the submitted note and record a decision.</p></div></header>
    {stats && <div className="stats-grid">{(['pending', 'approved', 'rejected'] as const).map((status) => <div className="stat-box" key={status}><span>{status}</span><strong>{stats[status] ?? 0}</strong></div>)}</div>}
    <div className="filter-bar"><div className="segmented" aria-label="Filter leave requests">{filters.map(({ label, value }) => <button key={label} type="button" aria-pressed={filter === value} onClick={() => chooseFilter(value)}>{label}</button>)}</div><span className="helper-copy">{total} requests</span></div>
    {error && <div className="alert" role="alert">{error}</div>}
    {loading ? <div className="panel loading-state">Loading assigned requests...</div> : items.length === 0 ? <div className="panel empty-state"><Check size={26} /><h2>Nothing to review</h2><p>New requests assigned to you will appear here.</p></div> : <div className="panel data-table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Leave</th><th>Dates</th><th>To</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr className="clickable-row" key={item.id} tabIndex={0} aria-label={`Request ${item.id} from ${item.employee.name}. Open details.`} onClick={() => setSelectedRequest(item)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelectedRequest(item) } }}><td><span className="table-primary">{item.employee.name}</span><span className="table-secondary">Request #{item.id}</span></td><td>{item.leave_type} leave</td><td>{dateRange(item)}</td><td>{item.recipient.name}<span className="table-secondary">{item.recipient.role}</span></td><td><StatusBadge status={item.status} /></td><td><div className="table-actions table-actions-end"><button className="icon-action" type="button" onClick={(event) => { event.stopPropagation(); setSelectedRequest(item) }} aria-label={`View request ${item.id} note`} title="View leave note"><ChevronRight size={18} /></button>{item.status === 'pending' && <><button className="primary-button compact-button" type="button" onClick={(event) => { event.stopPropagation(); setDecision({ id: item.id, action: 'approved' }); setComment('') }}><Check size={14} />Approve</button><button className="danger-button compact-button" type="button" onClick={(event) => { event.stopPropagation(); setDecision({ id: item.id, action: 'rejected' }); setComment('') }}><X size={14} />Reject</button></>}</div></td></tr>)}</tbody></table></div>}
    {hasMore && <div ref={sentinelRef} className="scroll-sentinel" aria-hidden="true" />}
    {loadingMore && <p className="helper-copy scroll-status" role="status">Loading more requests...</p>}
    {selectedRequest && <LeaveDetailsDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    {decision && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="decision-title"><h2 id="decision-title">{decision.action === 'approved' ? 'Approve request?' : 'Reject request?'}</h2><p>{decision.action === 'rejected' ? 'A comment is required when rejecting.' : 'The employee will see this request as approved.'}</p>{decision.action === 'rejected' && <div className="field"><label htmlFor="review-comment">Reason for rejection</label><textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} required /></div>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDecision(null)}>Cancel</button><button className={decision.action === 'approved' ? 'primary-button' : 'danger-button'} type="button" disabled={saving || (decision.action === 'rejected' && !comment.trim())} onClick={decide}>{saving ? 'Saving...' : decision.action === 'approved' ? 'Confirm approval' : 'Confirm rejection'}</button></div></section></div>}
  </div>
}