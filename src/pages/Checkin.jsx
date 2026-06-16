import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { displayStatus, isOverdue, fmtDate, STATUS_LABELS } from '../lib/constants'

export default function Checkin() {
  const { profile, isAdmin } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    let q = supabase.from('tasks').select('*').neq('status', 'done').order('priority')
    if (!isAdmin) q = q.eq('assigned_to', profile?.name)
    const { data } = await q
    setTasks(data || [])
    setLoading(false)
  }

  const today = tasks.filter(t => t.deadline === new Date().toISOString().slice(0, 10))
  const overdue = tasks.filter(t => isOverdue(t.deadline, t.status))
  const stuck = tasks.filter(t => t.status === 'stuck')
  const ongoing = tasks.filter(t => t.status === 'running' && !isOverdue(t.deadline, t.status))
  const pending = tasks.filter(t => t.status === 'pending')
  const upcoming = tasks.filter(t => t.status === 'upcoming')

  const Section = ({ title, items, color, emptyMsg }) => (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: items.length ? '12px' : 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{title}</div>
        <span style={{ background: color + '22', color, padding: '1px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>{items.length}</span>
      </div>
      {items.length === 0
        ? <div style={{ fontSize: '13px', color: '#9ca3af' }}>{emptyMsg}</div>
        : items.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
            <span className={`badge badge-${displayStatus(t)}`} style={{ flexShrink: 0 }}>{STATUS_LABELS[displayStatus(t)]}</span>
            <span style={{ flex: 1, fontSize: '13px' }}>{t.title}</span>
            {isAdmin && <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>{t.assigned_to}</span>}
            {t.deadline && <span style={{ fontSize: '11px', color: isOverdue(t.deadline, t.status) ? '#D85A30' : '#9ca3af', flexShrink: 0 }}>📅 {fmtDate(t.deadline)}</span>}
          </div>
        ))}
    </div>
  )

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🌅 Morning Checkin</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, color: '#0C447C', marginBottom: '4px' }}>Good morning{profile?.name ? ', ' + profile.name : ''}! 👋</div>
        <div style={{ fontSize: '13px', color: '#185FA5' }}>
          Aaj ke liye: <strong>{today.length}</strong> tasks due today, <strong>{overdue.length}</strong> overdue, <strong>{stuck.length}</strong> stuck.
          {tasks.length > 0 && ` Total ${tasks.length} active tasks.`}
        </div>
      </div>

      {overdue.length > 0 && <Section title="🔴 Overdue — Urgent" items={overdue} color="#D85A30" emptyMsg="" />}
      {today.length > 0 && <Section title="📅 Due Today" items={today} color="#BA7517" emptyMsg="" />}
      {stuck.length > 0 && <Section title="⚠️ Stuck / Blocked" items={stuck} color="#D85A30" emptyMsg="Koi task stuck nahi" />}
      <Section title="🔄 Ongoing" items={ongoing} color="#185FA5" emptyMsg="Koi ongoing task nahi" />
      <Section title="⏳ Pending" items={pending} color="#BA7517" emptyMsg="Koi pending task nahi" />
      {upcoming.length > 0 && <Section title="📆 Upcoming" items={upcoming} color="#534AB7" emptyMsg="" />}
    </div>
  )
}
