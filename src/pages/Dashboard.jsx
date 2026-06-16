import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { displayStatus, isOverdue, fmtDate, AVATAR_COLORS, initials } from '../lib/constants'
import { useToast } from '../hooks/useToast'

const MEMBERS = ['Aman', 'Anurag', 'Kunal', 'Harshita']

export default function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('tasks').select('*, remarks(*)').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const all = tasks
  const byStatus = s => all.filter(t => t.status === s).length
  const overdue = all.filter(t => isOverdue(t.deadline, t.status)).length
  const high = all.filter(t => t.priority === 'high' && t.status !== 'done').length

  const memberStats = MEMBERS.map(m => {
    const mt = all.filter(t => t.assigned_to === m)
    return {
      name: m, total: mt.length, done: mt.filter(t => t.status === 'done').length,
      stuck: mt.filter(t => t.status === 'stuck').length,
      overdue: mt.filter(t => isOverdue(t.deadline, t.status)).length,
      pending: mt.filter(t => t.status === 'pending').length,
    }
  })

  const recentRemarks = tasks.flatMap(t => (t.remarks || []).map(r => ({ ...r, taskTitle: t.title }))).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8)

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Dashboard</h1>
        <span style={{ fontSize: '13px', color: '#6b7280' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', num: all.length, color: '#185FA5' },
          { label: 'Ongoing', num: byStatus('running'), color: '#185FA5' },
          { label: 'Pending', num: byStatus('pending'), color: '#BA7517' },
          { label: 'Stuck', num: byStatus('stuck'), color: '#D85A30' },
          { label: 'Overdue', num: overdue, color: '#791F1F' },
          { label: 'Done', num: byStatus('done'), color: '#1D9E75' },
          { label: 'High Priority', num: high, color: '#D85A30' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '14px' }}>👥 Team Overview</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {memberStats.map(m => (
              <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={`avatar ${AVATAR_COLORS[m.name] || 'avatar-gray'}`}>{initials(m.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{m.done}/{m.total} done</span>
                  </div>
                  <div style={{ height: '4px', background: '#f3f4f6', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${m.total ? Math.round((m.done / m.total) * 100) : 0}%`, background: '#1D9E75', borderRadius: '2px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                    {m.stuck > 0 && <span style={{ fontSize: '10px', color: '#D85A30' }}>⚠ {m.stuck} stuck</span>}
                    {m.overdue > 0 && <span style={{ fontSize: '10px', color: '#791F1F' }}>🔴 {m.overdue} overdue</span>}
                    {m.pending > 0 && <span style={{ fontSize: '10px', color: '#BA7517' }}>⏳ {m.pending} pending</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '14px' }}>🕐 Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {recentRemarks.length === 0 && <div style={{ color: '#9ca3af', fontSize: '13px' }}>Koi activity nahi abhi</div>}
            {recentRemarks.map(r => (
              <div key={r.id} style={{ padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>
                  {r.author} · {new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {r.is_auto && <span style={{ marginLeft: '4px', background: '#E1F5EE', color: '#085041', padding: '0 5px', borderRadius: '10px', fontSize: '10px' }}>⚡ Auto</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#374151' }}><span style={{ color: '#185FA5' }}>{r.taskTitle}</span> — {r.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '14px' }}>🚨 Needs Attention</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tasks.filter(t => t.status === 'stuck' || isOverdue(t.deadline, t.status) || (t.priority === 'high' && t.status !== 'done')).slice(0, 6).map(t => {
            const ds = displayStatus(t)
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#f9fafb', borderRadius: '6px' }}>
                <span className={`badge badge-${ds}`} style={{ flexShrink: 0 }}>{ds}</span>
                <span style={{ flex: 1, fontSize: '13px' }}>{t.title}</span>
                <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>{t.assigned_to}</span>
              </div>
            )
          })}
          {tasks.filter(t => t.status === 'stuck' || isOverdue(t.deadline, t.status) || (t.priority === 'high' && t.status !== 'done')).length === 0 &&
            <div style={{ color: '#9ca3af', fontSize: '13px' }}>✅ Sab theek hai! Koi urgent item nahi.</div>}
        </div>
      </div>
    </div>
  )
}
