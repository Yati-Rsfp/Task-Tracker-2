import { useState, useEffect, useMemo } from 'react'
import { STATUS_OPTIONS, PRIORITY_OPTIONS, TEAM_MEMBERS } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function TaskModal({ task, onClose, onSave }) {
  const { profile, isAdmin, profiles } = useAuth()
  const { toast } = useToast()
  const currentUserName = profile?.name || ''
  const currentUserId = profile?.id || ''
  const assignableMembers = useMemo(() => {
    if (!currentUserId) return []

    if (!isAdmin) {
      return [{ value: currentUserId, label: 'Self' }]
    }

    const base = (profiles.length ? profiles : TEAM_MEMBERS.map(name => ({ id: name.toLowerCase(), name })))
      .filter(p => p.name)
      .map(p => ({ value: p.id, label: p.name }))

    const filtered = base.filter(p => p.value !== currentUserId)
    return [{ value: currentUserId, label: 'Self' }, ...filtered]
  }, [profiles, isAdmin, currentUserId])
  const [form, setForm] = useState({
    title: '', note: '', status: 'pending', priority: 'medium',
    assigned_to_id: currentUserId || '', deadline: '', start_date: '', target_date: ''
  })
  const [saving, setSaving] = useState(false)

  function resolveAssignee(value) {
    const found = profiles.find(p => p.id === value)
    if (found) return { id: found.id, name: found.name }
    if (value === currentUserId) return { id: currentUserId, name: currentUserName || 'Self' }
    return { id: null, name: value || '' }
  }

  useEffect(() => {
    setForm(prev => {
      if (task) {
        const taskAssignee = task.assigned_to_id || profiles.find(p => p.name?.toLowerCase() === task.assigned_to?.toLowerCase())?.id || ''
        return {
          title: task.title || '',
          note: task.note || '',
          status: task.status || 'pending',
          priority: task.priority || 'medium',
          assigned_to_id: taskAssignee || currentUserId || '',
          deadline: task.deadline || '',
          start_date: task.start_date || '',
          target_date: task.target_date || '',
        }
      }

      if (prev.assigned_to_id) return prev

      return {
        ...prev,
        assigned_to_id: currentUserId || '',
      }
    })
  }, [task, currentUserId, profiles])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)
    const assignee = resolveAssignee(form.assigned_to_id)
    const payload = {
      ...form,
      title: form.title.trim(),
      note: form.note.trim(),
      assigned_to_id: assignee.id,
      assigned_to: assignee.name,
      deadline: form.deadline || null,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
      updated_at: new Date().toISOString(),
    }
    if (task?.id) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', task.id)
      if (!error) { toast('Task updated!', 'success'); onSave() }
    } else {
      const { error } = await supabase.from('tasks').insert({ ...payload, created_by: currentUserName || 'User' })
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
              <select value={form.assigned_to_id} onChange={e => set('assigned_to_id', e.target.value)}>
                {assignableMembers.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
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
