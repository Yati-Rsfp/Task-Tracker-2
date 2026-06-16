import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUS_LABELS, displayStatus, isOverdue, fmtDate } from '../lib/constants'

export default function AISummary() {
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [mode, setMode] = useState('full')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('tasks').select('*, remarks(*)').order('priority')
    setTasks(data || [])
    setLoading(false)
  }

  async function generate() {
    setGenerating(true); setSummary('')
    const today = new Date().toISOString().slice(0, 10)
    const lines = tasks.map(t => {
      const ds = displayStatus(t)
      const lastR = t.remarks?.length ? ` | Last update: "${t.remarks.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0].text}"` : ''
      return `[${STATUS_LABELS[ds]||ds}][${t.priority.toUpperCase()}][${t.assigned_to}] ${t.title}${t.deadline ? ' | Deadline: '+t.deadline : ''}${t.target_date ? ' | Target: '+t.target_date : ''}${lastR}`
    }).join('\n')

    const prompts = {
      full: `Aaj: ${today}. Main marketing head hoon. Team: Aman (Dryer vertical), Anurag (Dried/Barefruit), Kunal (Creative & Video), Harshita (external agency).\n\nTask board:\n${lines}\n\nMujhe ek comprehensive Hinglish summary do:\n1. Overall progress — kya achha chal raha hai\n2. Kya stuck/pending hai aur possible reasons\n3. Overdue ya urgent tasks list\n4. Team member wise status (Aman/Anurag/Kunal/Harshita)\n5. Aaj ke top 5 action items mere liye\n6. Agar koi pattern ya systemic issue dikh raha ho toh batao\n\nDetailed rakho, actionable insights do.`,
      quick: `Aaj: ${today}. Task board:\n${lines}\n\nSirf 5 bullet points mein:\n1. Top urgent task\n2. Kya atka hai\n3. Kya almost done hai\n4. Ek important follow-up\n5. Aaj ka priority #1\n\nBilkul concise, Hinglish mein.`,
      team: `Task board:\n${lines}\n\nHar team member ke liye alag section:\n- Aman: kya chal raha, kya pending, performance\n- Anurag: same\n- Kunal: same\n- Harshita (agency): same\n\nHinglish mein, honest assessment.`
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{ role: 'user', content: prompts[mode] }]
        })
      })
      const data = await res.json()
      setSummary(data.content?.[0]?.text || 'Error generating summary')
    } catch (e) {
      setSummary('Error: ' + e.message)
    }
    setGenerating(false)
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🤖 AI Summary</h1>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[{ k: 'full', l: '📊 Full Analysis' }, { k: 'quick', l: '⚡ Quick Bullets' }, { k: 'team', l: '👥 Team View' }].map(m => (
              <button key={m.k} className={mode === m.k ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'} onClick={() => setMode(m.k)}>{m.l}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={generate} disabled={generating} style={{ marginLeft: 'auto' }}>
            {generating ? '⏳ Generating...' : '✨ Generate Summary'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Summary — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <button className="btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(summary) }}>📋 Copy</button>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.7', color: '#374151' }}>{summary}</div>
        </div>
      )}

      {!summary && !generating && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          <p>Mode choose karein aur "Generate Summary" dabao</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>{tasks.length} tasks current board mein hain</p>
        </div>
      )}

      {generating && (
        <div className="card" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#6b7280' }}>AI analyze kar raha hai...</p>
          </div>
        </div>
      )}
    </div>
  )
}
