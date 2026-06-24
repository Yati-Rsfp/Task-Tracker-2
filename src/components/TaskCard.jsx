import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUS_OPTIONS, STATUS_LABELS, AVATAR_COLORS, detectStatusFromRemark, isOverdue, displayStatus, initials, fmtDate } from '../lib/constants'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function TaskCard({ task, onUpdate, onDelete, onEdit }) {
  const { isAdmin, profile } = useAuth()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [remarkText, setRemarkText] = useState('')
  const [saving, setSaving] = useState(false)

  const ds = displayStatus(task)
  const over = ds === 'overdue'
  const canEdit = isAdmin || task.assigned_to === profile?.name
  const remarks = task.remarks || []
  const latestRemark = [...remarks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

  async function changeStatus(newStatus) {
    if (!canEdit) return
    const prev = STATUS_LABELS[task.status] || task.status
    const { error } = await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id)
    if (!error) {
      await supabase.from('remarks').insert({
        task_id: task.id, text: `Status changed: ${prev} → ${STATUS_LABELS[newStatus]}`,
        author: profile?.name || 'System', is_auto: true
      })
      toast(`Status updated to ${STATUS_LABELS[newStatus]}`, 'success')
      onUpdate()
    }
  }

  async function addRemark() {
    if (!remarkText.trim() || saving) return
    setSaving(true)
    const detected = detectStatusFromRemark(remarkText)
    let autoMsg = ''
    const prevStatus = task.status

    if (detected && detected.status !== task.status) {
      await supabase.from('tasks').update({ status: detected.status, updated_at: new Date().toISOString() }).eq('id', task.id)
      autoMsg = `Auto-update: ${STATUS_LABELS[prevStatus]} → ${STATUS_LABELS[detected.status]}`
    }

    await supabase.from('remarks').insert({
      task_id: task.id, text: remarkText.trim(),
      author: profile?.name || 'Unknown', is_auto: false, auto_msg: autoMsg || null
    })

    if (autoMsg) toast(autoMsg, 'success')
    else toast('Remark saved', 'success')
    setRemarkText('')
    setSaving(false)
    onUpdate()
  }

  async function saveTL(field, value) {
    await supabase.from('tasks').update({ [field]: value || null, updated_at: new Date().toISOString() }).eq('id', task.id)
    if (field === 'deadline') {
      await supabase.from('remarks').insert({
        task_id: task.id, text: `Deadline updated to: ${value || 'removed'}`,
        author: profile?.name || 'System', is_auto: true
      })
    }
    onUpdate()
  }

  return (
    <div className={`task-card ${task.status === 'done' ? 'done' : ''} ${over ? 'overdue-border' : ''}`}>
      <div className="task-top">
        <div className="task-body">
          <div className={`task-title ${task.status === 'done' ? 'struck' : ''}`}>{task.title}</div>
          {task.note && <div className="task-note">{task.note}</div>}
          <div className="task-meta">
            <span className={`badge badge-${ds}`}>{STATUS_LABELS[ds]}</span>
            <span className={`badge badge-${task.priority}`}>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
            <span className="badge" style={{ background: '#f3f4f6', color: '#374151' }}>
              <span>{initials(task.assigned_to)}</span> {task.assigned_to}
            </span>
            {task.deadline && (
              <span className={`date-pill ${over ? 'overdue' : ''}`}>
                📅 {fmtDate(task.deadline)}{over ? ' — Overdue' : ''}
              </span>
            )}
            {task.target_date && !task.deadline && (
              <span className="date-pill">🎯 Target: {fmtDate(task.target_date)}</span>
            )}
            {remarks.length > 0 && (
              <span className="date-pill">💬 {remarks.length}</span>
            )}
          </div>
          {latestRemark && (
            <div style={{ marginTop: '8px', padding: '8px 10px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #eef2f7' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>
                Latest comment · {latestRemark.author}
              </div>
              <div style={{ fontSize: '12px', color: '#374151' }}>
                {latestRemark.text}
              </div>
            </div>
          )}
        </div>
        <div className="task-right">
          {canEdit ? (
            <select
              className="btn-sm"
              style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}
              value={task.status}
              onChange={e => changeStatus(e.target.value)}
            >
              {STATUS_OPTIONS.filter(s => s.value !== 'overdue').map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          ) : (
            <span className={`badge badge-${ds}`}>{STATUS_LABELS[ds]}</span>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            {isAdmin && (
              <>
                <button className="btn-ghost btn-sm" onClick={() => onEdit(task)} title="Edit">✏️</button>
                <button className="btn-ghost btn-sm" onClick={() => onDelete(task.id)} title="Delete">🗑️</button>
              </>
            )}
            <button className="btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="expand-area">
          <div className="sec-lbl">💬 Remarks / Updates</div>
          <div className="remarks-list">
            {remarks.length === 0 && <div style={{ fontSize: '12px', color: '#9ca3af' }}>Koi remark nahi abhi tak</div>}
            {remarks.map(r => (
              <div key={r.id} className="remark-item">
                <div className="remark-meta">
                  <span>{r.author}</span>
                  <span>{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} {new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  {r.is_auto && <span className="remark-auto-badge">⚡ Auto</span>}
                </div>
                <div className="remark-text">{r.text}</div>
                {r.auto_msg && <div className="remark-action">⚡ {r.auto_msg}</div>}
              </div>
            ))}
          </div>
          {canEdit && (
            <>
              <div className="remark-input-row">
                <textarea
                  value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                  placeholder='Update likhein... ("done kar diya", "stuck hai", "hold pe")'
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addRemark() } }}
                />
                <button className="btn-primary btn-sm" onClick={addRemark} disabled={saving} style={{ height: '38px', whiteSpace: 'nowrap' }}>
                  Send
                </button>
              </div>
              <div className="smart-hint">⚡ Smart: "done", "stuck", "hold", "start" likhne se status auto-update hoga</div>
            </>
          )}

          {isAdmin && (
            <div className="tl-section">
              <div className="sec-lbl">📅 Timeline</div>
              <div className="form-row form-row-3">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Start date</label>
                  <input type="date" defaultValue={task.start_date || ''} onBlur={e => saveTL('start_date', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Deadline</label>
                  <input type="date" defaultValue={task.deadline || ''} onBlur={e => saveTL('deadline', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Target completion</label>
                  <input type="date" defaultValue={task.target_date || ''} onBlur={e => saveTL('target_date', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
