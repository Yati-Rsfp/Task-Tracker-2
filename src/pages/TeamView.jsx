import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { displayStatus, STATUS_LABELS, AVATAR_COLORS, initials, isOverdue, TEAM_MEMBERS } from '../lib/constants'

export default function TeamView() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const { memberProfiles } = useAuth()

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('tasks').select('*, remarks(*)').order('priority')
    setTasks(data || [])
    setLoading(false)
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>

  const members = memberProfiles.length ? memberProfiles : TEAM_MEMBERS.map(name => ({ name }))
  const activeSelected = selected || members[0]?.name || ''
  const memberTasks = tasks.filter(t => t.assigned_to === activeSelected)
  const mt = tasks
  const stats = members.map(m => {
    const t = mt.filter(x => x.assigned_to === m.name)
    return { name: m.name, total: t.length, done: t.filter(x => x.status === 'done').length, stuck: t.filter(x => x.status === 'stuck').length, overdue: t.filter(x => isOverdue(x.deadline, x.status)).length }
  })

  return (
    <div>
      <div className="page-header"><h1 className="page-title">👥 Team View</h1></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '10px', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.name} className="card card-hover" style={{ cursor: 'pointer', borderColor: activeSelected === s.name ? '#185FA5' : '#e5e7eb', borderWidth: activeSelected === s.name ? '2px' : '1px' }} onClick={() => setSelected(s.name)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div className={`avatar ${AVATAR_COLORS[s.name] || 'avatar-gray'}`}>{initials(s.name)}</div>
              <span style={{ fontWeight: 500, fontSize: '14px' }}>{s.name}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.done}/{s.total} done</div>
            <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '2px', margin: '5px 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${s.total ? Math.round(s.done/s.total*100) : 0}%`, background: '#1D9E75', borderRadius: '2px' }} />
            </div>
            {s.stuck > 0 && <span style={{ fontSize: '11px', color: '#D85A30' }}>⚠ {s.stuck} stuck</span>}
            {s.overdue > 0 && <span style={{ fontSize: '11px', color: '#791F1F', marginLeft: s.stuck ? '6px' : 0 }}>🔴 {s.overdue} overdue</span>}
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 600, marginBottom: '1rem' }}>
        {activeSelected}'s Tasks ({memberTasks.length})
      </div>
      <div className="task-list">
        {memberTasks.length === 0 && <div className="empty-state"><p>Koi task assign nahi hai {activeSelected} ko</p></div>}
        {memberTasks.map(t => {
          const ds = displayStatus(t)
          const over = ds === 'overdue'
          const lastR = t.remarks?.length ? t.remarks.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0] : null
          return (
            <div key={t.id} className={`task-card ${over ? 'overdue-border' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '5px' }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge badge-${ds}`}>{STATUS_LABELS[ds]}</span>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    {t.deadline && <span style={{ fontSize: '11px', color: over ? '#D85A30' : '#9ca3af' }}>📅 {t.deadline}</span>}
                  </div>
                  {lastR && <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', background: '#f9fafb', padding: '5px 8px', borderRadius: '5px' }}>
                    💬 <strong>{lastR.author}</strong>: {lastR.text}
                  </div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
