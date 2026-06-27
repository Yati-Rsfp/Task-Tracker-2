import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import Sidebar from './components/Sidebar'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Checkin from './pages/Checkin'
import EOD from './pages/EOD'
import AISummary from './pages/AISummary'
import TeamView from './pages/TeamView'
import Members from './pages/Members'
import {useState} from 'react'

function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', minWidth: 0 }}>
      
      {/* MOBILE HEADER BAR */}
      <div 
        className="mobile-header"
        style={{
          display: 'none', 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '50px',
          background: '#ffffff',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          padding: '0 1rem',
          zIndex: 100,
          boxSizing: 'border-box'
        }}
      >
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '4px',
            color: '#185FA5'
          }}
        >
          ☰
        </button>
        <span style={{ marginLeft: '12px', fontWeight: 600, fontSize: '15px', color: '#185FA5' }}>Team Tracker</span>
      </div>

      {/* MOBILE DARK BACKDROP OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 998
          }}
        />
      )}

      {/* FIXED: Uses the custom sidebar-mobile-drawer class definition */}
      <div 
        className={`sidebar-mobile-drawer ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)} // Closes drawer if an inner navigation link is tapped
      >
        <Sidebar />
      </div>

      {/* PRIMARY VIEWPANEL ENTRYPOINT */}
      <div className="main-content" style={{ flex: '1 1 0%', minWidth: 0 }}>
        {children}
      </div>

      {/* Inline styles to manage Mobile Header Visibility toggles cleanly */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  )
}


function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading, isAdmin } = useAuth()
  if (loading) return <div className="loading"><div className="spinner" /><span>Loading...</span></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/tasks" replace />
  return children
}

function AppRoutes() {
  const { user, isAdmin } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" replace />} />
      <Route path="/" element={<ProtectedRoute><Layout><Navigate to={isAdmin ? "/dashboard" : "/checkin"} replace /></Layout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute adminOnly><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks key="tasks-mine" showAll={false} /></Layout></ProtectedRoute>} />
      <Route path="/all-tasks" element={<ProtectedRoute adminOnly><Layout><Tasks key="tasks-all" showAll={true} /></Layout></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute adminOnly><Layout><TeamView /></Layout></ProtectedRoute>} />
      <Route path="/members" element={<ProtectedRoute adminOnly><Layout><Members /></Layout></ProtectedRoute>} />
      <Route path="/checkin" element={<ProtectedRoute><Layout><Checkin /></Layout></ProtectedRoute>} />
      <Route path="/eod" element={<ProtectedRoute><Layout><EOD /></Layout></ProtectedRoute>} />
      <Route path="/summary" element={<ProtectedRoute adminOnly><Layout><AISummary /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
