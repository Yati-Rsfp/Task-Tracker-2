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
  
  // Calculate stats array for all members
  const allStats = members.map(m => {
    const t = mt.filter(x => x.assigned_to === m.name)
    return { 
      name: m.name, 
      total: t.length, 
      done: t.filter(x => x.status === 'done').length, 
      stuck: t.filter(x => x.status === 'stuck').length, 
      overdue: t.filter(x => isOverdue(x.deadline, x.status)).length 
    }
  })

  // Determine which 4 cards to show in the top panel
  const firstThree = allStats.slice(0, 3)
  const selectedIndex = allStats.findIndex(s => s.name === activeSelected)
  
  let visibleCards = []
  if (selectedIndex < 3) {
    visibleCards = allStats.slice(0, 4)
  } else {
    visibleCards = [...firstThree, allStats[selectedIndex]]
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>👥 Team View</h1>
        
        {/* Dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="member-select" style={{ fontSize: '13px', fontWeight: 500, color: '#4b5563' }}>Find Member:</label>
          <select
            id="member-select"
            value={activeSelected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              fontSize: '14px',
              color: 'var(--text)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '180px'
            }}
          >
            {allStats.map(m => (
              <option key={m.name} value={m.name}>
                {m.name} ({m.done}/{m.total} done)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Stats Grid (Max 4 Cards) */}
      <div className="stats-grid">
        {visibleCards.map(s => {
          const isCurrentActive = activeSelected === s.name;
          return (
            <div 
              key={s.name} 
              className="card card-hover" 
              style={{ 
                cursor: 'pointer', 
                boxSizing: 'border-box', 
                minHeight: '132px', 
                borderColor: isCurrentActive ? '#185FA5' : '#e5e7eb', 
                borderWidth: '1px', 
                borderStyle: 'solid',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: isCurrentActive ? '0 0 0 1px #185FA5 inset' : 'none' 
              }} 
              onClick={() => setSelected(s.name)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', minWidth: 0 }}>
                <div className={`avatar ${AVATAR_COLORS[s.name] || 'avatar-gray'}`}>{initials(s.name)}</div>
                <span className="text-truncate" style={{ fontWeight: 500, fontSize: '14px', flex: 1 }}>
                  {s.name}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.done}/{s.total} done</div>
              <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '2px', margin: '5px 0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.total ? Math.round(s.done/s.total*100) : 0}%`, background: '#1D9E75', borderRadius: '2px' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {s.stuck > 0 && <span style={{ fontSize: '11px', color: '#D85A30' }}>⚠ {s.stuck}</span>}
                {s.overdue > 0 && <span style={{ fontSize: '11px', color: '#791F1F' }}>🔴 {s.overdue}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Member Header */}
      <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '15px' }}>
        {activeSelected}'s Tasks ({memberTasks.length})
      </div>
      
      {/* Task Cards List */}
      <div className="task-list">
        {memberTasks.length === 0 && <div className="empty-state"><p>Koi task assign nahi hai {activeSelected} ko</p></div>}
        {memberTasks.map(t => {
          const ds = displayStatus(t)
          const over = ds === 'overdue'
          const lastR = t.remarks?.length ? t.remarks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] : null
          
          return (
            <div key={t.id} className={`task-card ${over ? 'overdue-border' : ''} ${t.status === 'done' ? 'done' : ''}`} style={{ width: '100%', boxSizing: 'border-box' }}>
              <div className="task-top"> 
                <div className="task-body">
                  <div className={`task-title ${t.status === 'done' ? 'struck' : ''}`}>
                    {t.title}
                  </div>
                  
                  <div className="task-meta">
                    <span className={`badge badge-${ds}`}>{STATUS_LABELS[ds]}</span>
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    {t.deadline && <span style={{ fontSize: '11px', color: over ? '#D85A30' : '#9ca3af' }}>📅 {t.deadline}</span>}
                  </div>

                  {/* SAFELY RETURNED COMMENT BOX WITH WRAPPING ASSURANCES */}
                  {lastR && (
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '12px', 
                      color: '#6b7280', 
                      background: '#f9fafb', 
                      padding: '6px 10px', 
                      borderRadius: '6px', 
                      border: '1px solid #f0f2f5',
                      
                      // Critical layout constraints for text container flow
                      width: '100%',
                      boxSizing: 'border-box',
                      whiteSpace: 'normal', 
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}>
                      💬 <strong>{lastR.author}</strong>: {lastR.text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}