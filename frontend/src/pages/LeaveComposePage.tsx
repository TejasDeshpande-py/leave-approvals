import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Send, Sparkles } from 'lucide-react'
import { ChevronSelect } from '../components/ChevronSelect'
import { leaveApi } from '../features/leaves/leaveApi'
import type { RecipientOption } from '../shared/types'

const today = new Date().toISOString().slice(0, 10)

export function LeaveComposePage() {
  const [recipients, setRecipients] = useState<RecipientOption[]>([])
  const [recipientKey, setRecipientKey] = useState('')
  const [leaveType, setLeaveType] = useState('casual')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [body, setBody] = useState('')
  const [aiBody, setAiBody] = useState('')
  const [submitVersion, setSubmitVersion] = useState<'manual' | 'ai'>('manual')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loadingRecipients, setLoadingRecipients] = useState(true)
  const [rephrasing, setRephrasing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    leaveApi.recipients()
      .then((items) => {
        if (!active) return
        setRecipients(items)
        if (items[0]) setRecipientKey(items[0].recipient_key)
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load recipients') })
      .finally(() => { if (active) setLoadingRecipients(false) })
    return () => { active = false }
  }, [])

  async function rephrase() {
    setError('')
    setSuccess('')
    setRephrasing(true)
    try {
      const response = await leaveApi.rephrase(body)
      setAiBody(response.ai_body)
      setSubmitVersion('ai')
    } catch (cause) {
      setAiBody('')
      setSubmitVersion('manual')
      setError(cause instanceof Error ? cause.message : 'Could not rephrase this note')
    } finally {
      setRephrasing(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await leaveApi.submit({ recipient_key: recipientKey, leave_type: leaveType, start_date: startDate, end_date: endDate, body, ai_body: aiBody || null, submitted_body: submitVersion === 'ai' && aiBody ? aiBody : body })
      setSuccess('Leave note submitted successfully.')
      setBody('')
      setAiBody('')
      setSubmitVersion('manual')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="page-wrap">
    <header className="page-heading"><div><p className="eyebrow">Leave request</p><h1>Write and submit</h1><p>Choose who receives it, write your note, and select which version to send.</p></div></header>
    <form className="panel form-panel" onSubmit={submit}>
      {error && <div className="alert" role="alert">{error}</div>}{success && <div className="alert success" role="status">{success}</div>}
      <div className="form-grid">
        <div className="field"><label htmlFor="leave-recipient">To</label><ChevronSelect className="recipient-select" id="leave-recipient" value={recipientKey} onChange={(event) => setRecipientKey(event.target.value)} required disabled={loadingRecipients || recipients.length === 0}>{loadingRecipients && <option value="">Loading recipients...</option>}{!loadingRecipients && recipients.length === 0 && <option value="">No active HR/admin recipients</option>}{recipients.map((recipient) => <option key={recipient.recipient_key} value={recipient.recipient_key}>{recipient.name} · {recipient.role.toUpperCase()}</option>)}</ChevronSelect></div>
        <div className="field"><label htmlFor="leave-type">Leave type</label><ChevronSelect id="leave-type" value={leaveType} onChange={(event) => setLeaveType(event.target.value)}><option value="casual">Casual</option><option value="sick">Sick</option><option value="earned">Earned</option><option value="unpaid">Unpaid</option></ChevronSelect></div>
        <div className="field"><label htmlFor="start-date">Start date</label><input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></div>
        <div className="field"><label htmlFor="end-date">End date</label><input id="end-date" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></div>
      </div>
      <h2 className="section-label">Leave note</h2>
      <div className="body-version-grid">
        <div className={`body-version ${submitVersion === 'manual' ? 'selected' : ''}`}><div className="version-head"><label className="version-choice"><input type="radio" name="submit-version" checked={submitVersion === 'manual'} onChange={() => setSubmitVersion('manual')} /> Your note</label><span className="version-tag">MANUAL</span></div><textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={3} maxLength={3000} placeholder="Write the reason for your leave request..." required aria-label="Your leave note" /></div>
        <div className={`body-version ${submitVersion === 'ai' ? 'selected' : ''}`}><div className="version-head"><label className="version-choice"><input type="radio" name="submit-version" checked={submitVersion === 'ai'} onChange={() => setSubmitVersion('ai')} disabled={!aiBody} /> Rephrased note</label><span className="version-tag">AI DRAFT</span></div><textarea value={aiBody} onChange={(event) => setAiBody(event.target.value)} maxLength={3000} placeholder="Use Rephrase to create a separate AI draft. Your original note remains unchanged." aria-label="AI rephrased note" /></div>
      </div>
      <div className="form-actions"><span className="helper-copy">Only the selected version is sent to your recipient.</span><div className="action-group"><button className="secondary-button" type="button" onClick={rephrase} disabled={body.trim().length < 3 || rephrasing}>{rephrasing ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{rephrasing ? 'Rephrasing...' : 'Rephrase note'}</button><button className="primary-button" type="submit" disabled={submitting || !recipientKey || (submitVersion === 'ai' && !aiBody)}><Send size={15} />{submitting ? 'Submitting...' : 'Submit request'}</button></div></div>
    </form>
  </div>
}