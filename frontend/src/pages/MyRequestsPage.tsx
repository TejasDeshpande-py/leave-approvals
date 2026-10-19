import { useEffect, useState } from 'react'
import { ChevronRight, FilePlus2, Inbox, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LeaveDetailsDialog } from '../components/LeaveDetailsDialog'
import { EditLeaveDialog } from '../components/EditLeaveDialog'
import { StatusBadge } from '../components/StatusBadge'
import { leaveApi } from '../features/leaves/leaveApi'
import type { LeaveRequest, LeaveStatus } from '../shared/types'

const filters: Array<{ label: string; value?: LeaveStatus }> = [{ label: 'All' }, { label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }]
const dateRange = (request: LeaveRequest) => `${new Date(`${request.start_date}T00:00:00`).toLocaleDateString()} – ${new Date(`${request.end_date}T00:00:00`).toLocaleDateString()}`

export function MyRequestsPage() {
  const [items, setItems] = useState<LeaveRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null)
  const [filter, setFilter] = useState<LeaveStatus | undefined>()
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    leaveApi.mine(filter).then((page) => { if (active) setItems(page.items) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load requests') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, refresh])

  function openDetails(id: number) {
    const request = items.find((item) => item.id === id)
    if (request) setSelectedRequest(request)
  }

  function chooseFilter(value?: LeaveStatus) {
    if (value === filter) return
    setLoading(true)
    setError('')
    setFilter(value)
  }

  return <div className="page-wrap">
    <header className="page-heading"><div><p className="eyebrow">Your history</p><h1>My requests</h1><p>Track every leave request you have submitted.</p></div><Link className="primary-button" to="/request"><FilePlus2 size={16} />New request</Link></header>
    <div className="filter-bar"><div className="segmented" aria-label="Filter by leave status">{filters.map(({ label, value }) => <button key={label} type="button" aria-pressed={filter === value} onClick={() => chooseFilter(value)}>{label}</button>)}</div><span className="helper-copy">{items.length} requests</span></div>
    {error && <div className="alert" role="alert">{error}</div>}
    {loading ? <div className="panel loading-state">Loading your requests...</div> : items.length === 0 ? <div className="panel empty-state"><Inbox size={26} /><h2>No requests here</h2><p>Submitted requests and their latest decisions will appear here.</p><Link className="quiet-button" to="/request">Write a leave request</Link></div> : <div className="panel data-table-wrap"><table className="data-table"><thead><tr><th>Leave</th><th>Dates</th><th>To</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr className="clickable-row" key={item.id} tabIndex={0} aria-label={`Request ${item.id}, ${item.leave_type} leave, ${item.status}. Open details.`} onClick={() => openDetails(item.id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openDetails(item.id) } }}><td><span className="table-primary">{item.leave_type} leave</span><span className="table-secondary">Request #{item.id}</span></td><td>{dateRange(item)}</td><td>{item.recipient.name}<span className="table-secondary">{item.recipient.role}</span></td><td><StatusBadge status={item.status} /></td><td><div className="table-actions table-actions-end">{item.status === 'pending' && <button className="icon-action" type="button" onClick={(event) => { event.stopPropagation(); setEditingRequest(item) }} aria-label={`Edit pending request ${item.id}`} title="Edit pending request"><Pencil size={15} /></button>}<button className="icon-action" type="button" onClick={(event) => { event.stopPropagation(); setSelectedRequest(item) }} aria-label={`View leave request ${item.id}`} title="View note"><ChevronRight size={18} /></button></div></td></tr>)}</tbody></table></div>}
    {selectedRequest && <LeaveDetailsDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    {editingRequest && <EditLeaveDialog request={editingRequest} onClose={() => setEditingRequest(null)} onSaved={() => { setEditingRequest(null); setLoading(true); setRefresh((value) => value + 1) }} />}
  </div>
}