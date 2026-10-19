import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { StatusBadge } from './StatusBadge'
import type { LeaveRequest } from '../shared/types'

function dateRange(request: LeaveRequest) {
  const start = new Date(`${request.start_date}T00:00:00`).toLocaleDateString()
  const end = new Date(`${request.end_date}T00:00:00`).toLocaleDateString()
  return `${start} – ${end}`
}

export function LeaveDetailsDialog({ request, onClose }: { request: LeaveRequest; onClose: () => void }) {
  return createPortal(<div className="modal-backdrop">
    <section className="modal workspace-modal leave-details-modal" role="dialog" aria-modal="true" aria-labelledby="leave-details-title">
      <header className="details-heading">
        <div><p className="eyebrow">Leave request #{request.id}</p><h2 id="leave-details-title">Request details</h2></div>
        <button className="icon-action" type="button" onClick={onClose} aria-label="Close request details" title="Close"><X size={17} /></button>
      </header>
      <dl className="details-grid">
        <div><dt>Employee</dt><dd>{request.employee.name}</dd></div>
        <div><dt>Leave type</dt><dd>{request.leave_type}</dd></div>
        <div><dt>Dates</dt><dd>{dateRange(request)}</dd></div>
        <div><dt>To</dt><dd>{request.recipient.name} · {request.recipient.role}</dd></div>
        <div><dt>Status</dt><dd><StatusBadge status={request.status} /></dd></div>
      </dl>
      <section className="detail-note-block">
        <h3>Submitted note</h3>
        <p>{request.submitted_body}</p>
      </section>
      {request.review_comment && <section className="detail-note-block">
        <h3>Reviewer comment</h3>
        <p>{request.review_comment}</p>
      </section>}
    </section>
  </div>, document.body)
}