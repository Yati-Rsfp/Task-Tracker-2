import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { initials, AVATAR_COLORS } from '../lib/constants'

const NavItem = ({ to, icon, label }) => (
  <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
    <span style={{ fontSize: '16px' }}>{icon}</span>
    <span>{label}</span>
  </NavLink>
)

export default function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const avatarClass = AVATAR_COLORS[profile?.name] || 'avatar-gray'

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, background: '#185FA5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>T</span>
          </div>
          <span>Team Tracker</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {isAdmin && <NavItem to="/dashboard" icon="📊" label="Dashboard" />}
        <NavItem to="/tasks" icon="✅" label="My Tasks" />
        {isAdmin && <NavItem to="/all-tasks" icon="📋" label="All Tasks" />}
        {isAdmin && <NavItem to="/team" icon="👥" label="Team View" />}
        <NavItem to="/checkin" icon="🌅" label="Morning Checkin" />
        <NavItem to="/eod" icon="🌆" label="EOD Update" />
        {isAdmin && <NavItem to="/summary" icon="🤖" label="AI Summary" />}
      </nav>
      <div className="sidebar-user">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className={`avatar ${avatarClass}`}>{initials(profile?.name || '?')}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>{profile?.name || 'User'}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{profile?.role === 'admin' ? 'Marketing Head' : 'Team Member'}</div>
          </div>
        </div>
        <button className="btn-ghost btn-sm" style={{ width: '100%', textAlign: 'left' }} onClick={handleSignOut}>
          🚪 Sign out
        </button>
      </div>
    </div>
  )
}
