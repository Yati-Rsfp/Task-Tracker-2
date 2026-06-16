import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { STATUS_OPTIONS, STATUS_LABELS, displayStatus } from '../lib/constants'

export default function EOD() {
  const { profile, isAdmin } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState([])
  const [updates, setUpdates] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    let q = supabase.from('tasks').select('*').neq('status', 'done').order('priority')
    if (!isAdmin) q = q.eq('assigned_to', profile?.name)
    const { data } = await q
    setTasks(data || [])
    setLoading(false)
  }

  function setUpdate(id, field, val) {
    setUpdates(p => ({ ...p, [id]: { ...p[id], [field]: val } }))
  }

  async function submitEOD() {
    setSubmitting(true)
    const promises = []
    for (const [taskId, upd] of Object.entries(updates)) {
      if (!upd.note && !upd.status) continue
      const task = tasks.find(t => t.id === taskId)
      if (!task) continue
      if (upd.status && upd.status !== task.status) {
        promises.push(supabase.from('tasks').update({ status: upd.status, updated_at: new Date().toISOString() }).eq('id', taskId))
      }
      if (upd.note) {
        promises.push(supabase.from('remarks').insert({
          task_id: taskId, text: `[EOD Update] ${upd.note}`,
          author: profile?.name || 'Team', is_auto: false,
          ...(upd.status && upd.status !== task.status ? { auto_msg: `Status: ${STATUS_LABELS[task.status]} → ${STATUS_LABELS[upd.status]}` } : {})
        }))
      }
    }
    await Promise.all(promises)
    setSubmitting(false)
    setSubmitted(true)
    toast('EOD update submitted! ✅', 'success')
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✅</div>
      <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>EOD Update Submitted!</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Aapke updates save ho gaye. Kal milte hain! 🌙</p>
      <button className="btn-primary" onClick={() => { setSubmitted(false); setUpdates({}); fetchTasks() }}>Update Again</button>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🌆 EOD Status Update</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Aaj ka kaam khatam hua? Har task ka status aur note update karein.</p>
        </div>
        <button className="btn-primary" onClick={submitEOD} disabled={submitting || Object.keys(updates).length === 0}>
          {submitting ? 'Submitting...' : '✅ Submit EOD Update'}
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state"><p>Koi active task nahi hai! Aaj ka kaam done! 🎉</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tasks.map(t => {
            const upd = updates[t.id] || {}
            const ds = displayStatus(t)
            return (
              <div key={t.id} className="card" style={{ borderLeft: upd.note || upd.status ? '3px solid #185FA5' : '1px solid #e5e7eb', borderRadius: upd.note || upd.status ? '0 12px 12px 0' : '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px', fontSize: '14px' }}>{t.title}</div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                      <span className={`badge badge-${ds}`}>{STATUS_LABELS[ds]}</span>
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      {!isAdmin && <span style={{ fontSize: '12px', color: '#9ca3af', alignSelf: 'center' }}>assigned to you</span>}
                      {isAdmin && <span style={{ fontSize: '12px', color: '#9ca3af', alignSelf: 'center' }}>{t.assigned_to}</span>}
                    </div>
                  </div>
                  <select
                    style={{ width: '140px', fontSize: '12px', padding: '5px 8px' }}
                    value={upd.status || t.status}
                    onChange={e => setUpdate(t.id, 'status', e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <textarea
                  style={{ height: '52px', fontSize: '12px' }}
                  placeholder={`Aaj kya kiya is task pe? Koi blocker? (optional)`}
                  value={upd.note || ''}
                  onChange={e => setUpdate(t.id, 'note', e.target.value)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
