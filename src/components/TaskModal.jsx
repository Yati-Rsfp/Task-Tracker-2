import { useState, useEffect } from 'react'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, TEAM_MEMBERS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function TaskModal({ task, onClose, onSave }) {
  const { profile, isAdmin } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({
    title: '', note: '', status: 'pending', priority: 'medium',
    assigned_to: 'Aman', deadline: '', start_date: '', target_date: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (task) setForm({ title: task.title || '', note: task.note || '', status: task.status || 'pending', priority: task.priority || 'medium', assigned_to: task.assigned_to || 'Aman', deadline: task.deadline || '', start_date: task.start_date || '', target_date: task.target_date || '' })
  }, [task])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form, title: form.title.trim(), note: form.note.trim(), deadline: form.deadline || null, start_date: form.start_date || null, target_date: form.target_date || null, updated_at: new Date().toISOString() }
    if (task?.id) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', task.id)
      if (!error) { toast('Task updated!', 'success'); onSave() }
    } else {
      const { error } = await supabase.from('tasks').insert({ ...payload, created_by: profile?.name || 'Admin' })
      if (!error) { toast('Task added!', 'success'); onSave() }
      else { toast('Error: ' + error.message, 'error') }
    }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span style={{ fontWeight: 600 }}>{task?.id ? 'Edit Task' : 'New Task'}</span>
          <button className="btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Task title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task likhein..." autoFocus />
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assign to</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label>Start date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Target completion</label>
              <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Notes / Context</label>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Koi context ya details..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? 'Saving...' : task?.id ? 'Update Task' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
