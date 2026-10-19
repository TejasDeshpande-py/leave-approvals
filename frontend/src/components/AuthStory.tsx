import { CalendarDays, ShieldCheck, UsersRound, Zap } from 'lucide-react'

export function AuthStory({ register = false }: { register?: boolean }) {
  return <aside className="auth-story">
    <p className="auth-kicker">{register ? 'JOIN OUR TEAM' : 'TAKE A BREAK'}</p>
    <h2>{register ? <>Create a better<br /><span>work rhythm.</span></> : <>Your time<br /><span>matters.</span></>}</h2>
    <p className="auth-story-copy">{register ? 'Bring your leave requests, decisions, and updates into one clear place.' : "Plan your leave, stay relaxed. We've got you covered."}</p>
    {register ? <div className="auth-benefits">
      <div><span className="benefit-icon"><CalendarDays size={17} /></span><p><strong>Easy leave tracking</strong><small>Apply and follow requests in one place.</small></p></div>
      <div><span className="benefit-icon"><UsersRound size={17} /></span><p><strong>Stay connected</strong><small>Your request goes to the right reviewer.</small></p></div>
      <div><span className="benefit-icon"><ShieldCheck size={17} /></span><p><strong>Clear decisions</strong><small>See approvals and updates as they happen.</small></p></div>
    </div> : <div className="auth-story-rule"><Zap size={14} /><span>Make room for what matters.</span></div>}
  </aside>
}