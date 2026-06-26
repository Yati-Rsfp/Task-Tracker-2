import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import { displayStatus, extractMentions } from '../lib/constants'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Ongoing' },
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'stuck', label: 'Stuck' },
  { key: 'onhold', label: 'On Hold' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'done', label: 'Done' },
]

export default function Tasks({ showAll = false }) {
  const { profile, isAdmin, profiles } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [search, setSearch] = useState('')
  const currentUserName = profile?.name || ''
  const memberNames = profiles.length ? profiles.map(m => m.name) : ['Aman', 'Anurag', 'Kunal', 'Harshita']
  const normalizedProfileName = currentUserName.trim().toLowerCase()
  const [taggedTaskIds, setTaggedTaskIds] = useState(new Set())

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*, remarks(*)')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    if (tasksError) toast('Error loading tasks', 'error')

    const { data: mentionData, error: mentionError } = normalizedProfileName
      ? await supabase.from('task_mentions').select('task_id').eq('user_name', normalizedProfileName)
      : { data: [], error: null }

    setTasks(tasksData || [])
    const idsFromTable = new Set((mentionData || []).map(m => m.task_id))
    const idsFromRemarks = new Set(
      (tasksData || [])
        .filter(t => extractMentions((t.remarks || []).map(r => r.text).join(' \n'), memberNames).map(n => n.toLowerCase()).includes(normalizedProfileName))
        .map(t => t.id)
    )
    setTaggedTaskIds(new Set([...idsFromTable, ...idsFromRemarks]))
    if (mentionError) {
      console.warn('task_mentions lookup failed, falling back to remark parsing', mentionError.message)
    }
    setLoading(false)
  }

  async function deleteTask(id) {
    if (!confirm('Delete this task?')) return
    await supabase.from('remarks').delete().eq('task_id', id)
    await supabase.from('tasks').delete().eq('id', id)
    toast('Task deleted', 'success')
    fetchTasks()
  }

  function openEdit(task) { setEditTask(task); setShowModal(true) }
  function openNew() { setEditTask(null); setShowModal(true) }

  const priOrder = { high: 0, medium: 1, low: 2 }
  const statusOrder = task => (displayStatus(task) === 'done' ? 1 : 0)
  const allMentions = tasks.map(t => ({
    ...t,
    mentionHits: extractMentions((t.remarks || []).map(r => r.text).join(' \n'), memberNames),
  }))

  const applyFilters = list => {
    let visible = [...list]
    if (search) visible = visible.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase()))
    if (ownerFilter) visible = visible.filter(t => t.assigned_to === ownerFilter)
    if (filter !== 'all') {
      if (filter === 'overdue') visible = visible.filter(t => displayStatus(t) === 'overdue')
      else visible = visible.filter(t => t.status === filter)
    }
    visible.sort((a, b) =>
      statusOrder(a) - statusOrder(b) ||
      priOrder[a.priority] - priOrder[b.priority] ||
      new Date(b.created_at) - new Date(a.created_at)
    )
    return visible
  }

  const isTaskOwnedByCurrentUser = task =>
    task.assigned_to_id === profile?.id || task.assigned_to?.trim().toLowerCase() === normalizedProfileName

  const assignedTasks = applyFilters(allMentions.filter(t => isTaskOwnedByCurrentUser(t)))
  const taggedTasks = applyFilters(allMentions.filter(t => taggedTaskIds.has(t.id) && !isTaskOwnedByCurrentUser(t)))
  const memberVisibleTasks = applyFilters(allMentions.filter(t => isTaskOwnedByCurrentUser(t) || taggedTaskIds.has(t.id)))
  const allVisible = applyFilters(allMentions)
  const totalVisibleCount = showAll ? allVisible.length : memberVisibleTasks.length

  const cnt = s => {
    const base = showAll ? allVisible : memberVisibleTasks
    return base.filter(t => s === 'overdue' ? displayStatus(t) === 'overdue' : t.status === s).length
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{showAll ? '📋 All Tasks' : '✅ My Tasks'}</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ width: '200px' }} />
          {(isAdmin || !showAll) && <button className="btn-primary" onClick={openNew}>+ New Task</button>}
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px,1fr))', marginBottom: '1rem' }}>
        {[{ s: 'running', l: 'Ongoing', c: '#185FA5' }, { s: 'pending', l: 'Pending', c: '#BA7517' }, { s: 'stuck', l: 'Stuck', c: '#D85A30' }, { s: 'overdue', l: 'Overdue', c: '#791F1F' }, { s: 'done', l: 'Done', c: '#1D9E75' }].map(x => (
          <div key={x.s} className="stat-card" onClick={() => setFilter(x.s)}>
            <div className="stat-num" style={{ color: x.c, fontSize: '20px' }}>{cnt(x.s)}</div>
            <div className="stat-lbl">{x.l}</div>
          </div>
        ))}
      </div>

      <div className="filters">
        {FILTERS.map(f => (
          <button key={f.key} className={`filter-btn ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} {f.key !== 'all' ? `(${cnt(f.key)})` : `(${totalVisibleCount})`}
          </button>
        ))}
        {showAll && (
          <>
            <span style={{ color: '#e5e7eb', margin: '0 4px' }}>|</span>
            {memberNames.map(m => (
              <button key={m} className={`filter-btn ${ownerFilter === m ? 'active' : ''}`} onClick={() => setOwnerFilter(ownerFilter === m ? '' : m)}>{m}</button>
            ))}
          </>
        )}
      </div>

      {!showAll ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <section>
            <div className="sec-lbl" style={{ marginBottom: '10px' }}>Assigned to you</div>
            {assignedTasks.length === 0 ? (
              <div className="empty-state">
                <p>Koi assigned task nahi hai</p>
              </div>
            ) : (
              <div className="task-list">
                {assignedTasks.map(t => (
                  <TaskCard key={t.id} task={t} onUpdate={fetchTasks} onDelete={deleteTask} onEdit={openEdit} contextLabel="Assigned" />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="sec-lbl" style={{ marginBottom: '10px' }}>Tagged with you</div>
            {taggedTasks.length === 0 ? (
              <div className="empty-state">
                <p>Koi tagged task nahi hai</p>
              </div>
            ) : (
              <div className="task-list">
                {taggedTasks.map(t => (
                  <TaskCard key={t.id} task={t} onUpdate={fetchTasks} onDelete={deleteTask} onEdit={openEdit} contextLabel="Tagged" />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : allVisible.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p>Koi task nahi is filter mein</p>
        </div>
      ) : (
        <div className="task-list">
          {allVisible.map(t => (
            <TaskCard key={t.id} task={t} onUpdate={fetchTasks} onDelete={deleteTask} onEdit={openEdit} />
          ))}
        </div>
      )}

      {showModal && <TaskModal task={editTask} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchTasks() }} />}
    </div>
  )
}
