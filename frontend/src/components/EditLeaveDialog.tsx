import { useState } from 'react'
import { createPortal } from 'react-dom'
import { LoaderCircle, Save, Sparkles, X } from 'lucide-react'
import { leaveApi } from '../features/leaves/leaveApi'
import { ApiError } from '../shared/api/client'
import type { LeaveRequest } from '../shared/types'

export function EditLeaveDialog({ request, onClose, onSaved }: {
  request: LeaveRequest
  onClose: () => void
  onSaved: () => void
}) {
  const [body, setBody] = useState(request.submitted_body)
  const [aiBody, setAiBody] = useState('')
  const [version, setVersion] = useState<'manual' | 'ai'>('manual')
  const [error, setError] = useState('')
  const [noteValidationError, setNoteValidationError] = useState('')
  const [rephrasing, setRephrasing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function rephrase() {
    setError('')
    setNoteValidationError('')
    setRephrasing(true)
    try {
      const result = await leaveApi.rephrase(body)
      setAiBody(result.ai_body)
      setVersion('ai')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not rephrase the note'
      if (cause instanceof ApiError && cause.status === 422) setNoteValidationError(message)
      else setError(message)
    } finally {
      setRephrasing(false)
    }
  }

  async function save() {
    setError('')
    setSaving(true)
    try {
      await leaveApi.updateNote(request.id, {
        body,
        ai_body: aiBody || null,
        submitted_body: version === 'ai' && aiBody ? aiBody : body,
      })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the request')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(<div className="modal-backdrop">
    <section className="modal workspace-modal leave-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-leave-title">
      <header className="details-heading">
        <div><p className="eyebrow">Pending request #{request.id}</p><h2 id="edit-leave-title">Edit leave note</h2></div>
        <button className="icon-action" type="button" onClick={onClose} aria-label="Close edit form" title="Close"><X size={17} /></button>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="edit-note-grid">
        <div className={`body-version ${version === 'manual' ? 'selected' : ''}`}>
          <div className="version-head"><label className="version-choice"><input type="radio" name="edit-submit-version" checked={version === 'manual'} onChange={() => setVersion('manual')} />Your note</label><span className="version-tag">MANUAL</span></div>
          <textarea id="edit-leave-body" value={body} onChange={(event) => { setBody(event.target.value); setNoteValidationError('') }} minLength={3} maxLength={3000} required aria-label="Your note" aria-invalid={Boolean(noteValidationError)} aria-describedby={noteValidationError ? 'edit-leave-validation' : undefined} />
          {noteValidationError && <div id="edit-leave-validation" className="alert" role="alert">{noteValidationError}</div>}
        </div>
        <div className={`body-version ${version === 'ai' ? 'selected' : ''}`}>
          <div className="version-head"><label className="version-choice"><input type="radio" name="edit-submit-version" checked={version === 'ai'} onChange={() => setVersion('ai')} disabled={!aiBody} />Rephrased note</label><span className="version-tag">AI DRAFT</span></div>
          <textarea id="edit-leave-ai-body" value={aiBody} onChange={(event) => setAiBody(event.target.value)} maxLength={3000} placeholder="Rephrase your note to create an AI draft." aria-label="Rephrased note" />
        </div>
      </div>
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={rephrase} disabled={body.trim().length < 3 || rephrasing}>{rephrasing ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}{rephrasing ? 'Rephrasing...' : 'Rephrase'}</button>
        <button className="primary-button" type="button" onClick={save} disabled={saving || body.trim().length < 3 || (version === 'ai' && !aiBody)}><Save size={15} />{saving ? 'Saving...' : 'Save changes'}</button>
      </div>
    </section>
  </div>, document.body)
}