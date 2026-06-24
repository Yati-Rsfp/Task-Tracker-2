import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { MEMBER_ROLE_LABELS } from '../lib/constants'

export default function Members() {
  const { profiles, profile, fetchProfiles } = useAuth()
  const { toast } = useToast()
  const [savingId, setSavingId] = useState('')
  const [draftRoles, setDraftRoles] = useState({})

  const sortedProfiles = useMemo(() => [...profiles], [profiles])

  function setDraft(id, role) {
    setDraftRoles(prev => ({ ...prev, [id]: role }))
  }

  async function saveRole(member) {
    const nextRole = draftRoles[member.id] || member.role
    if (nextRole === member.role) return
    if (member.id === profile?.id) {
      toast('Own role changes are disabled here to avoid locking you out.', 'error')
      return
    }

    setSavingId(member.id)
    const { error } = await supabase.rpc('admin_set_profile_role', {
      target_id: member.id,
      target_role: nextRole,
    })
    setSavingId('')

    if (error) {
      const fallback = await supabase.from('profiles').update({ role: nextRole }).eq('id', member.id)
      if (fallback.error) {
        toast(fallback.error.message || error.message, 'error')
        return
      }
    }

    toast(`${member.name} updated to ${nextRole}.`, 'success')
    setDraftRoles(prev => ({ ...prev, [member.id]: nextRole }))
    await fetchProfiles()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👤 Members</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
            Manage member roles directly in the app.
          </p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedProfiles.length === 0 && (
            <div style={{ color: '#9ca3af', fontSize: '13px' }}>No profiles found yet.</div>
          )}
          {sortedProfiles.map(member => {
            const draftRole = draftRoles[member.id] || member.role
            const locked = member.id === profile?.id
            return (
              <div
                key={member.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 120px',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{member.id}</div>
                </div>
                <select
                  value={draftRole}
                  disabled={locked}
                  onChange={e => setDraft(member.id, e.target.value)}
                >
                  {Object.keys(MEMBER_ROLE_LABELS).map(role => (
                    <option key={role} value={role}>
                      {MEMBER_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  onClick={() => saveRole(member)}
                  disabled={locked || savingId === member.id}
                >
                  {locked ? 'Current user' : savingId === member.id ? 'Saving...' : 'Save role'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
