import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 48, height: 48, background: '#185FA5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <span style={{ color: '#fff', fontSize: '22px', fontWeight: 700 }}>T</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>Team Tracker</h1>
          <p style={{ color: '#6b7280', fontSize: '13px' }}>Marketing Operations Portal</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoFocus />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div style={{ color: '#D85A30', fontSize: '13px', marginBottom: '12px', padding: '8px 12px', background: '#FAECE7', borderRadius: '6px' }}>{error}</div>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '12px', color: '#9ca3af' }}>
          Admin se account maangein
        </p>
      </div>
    </div>
  )
}
