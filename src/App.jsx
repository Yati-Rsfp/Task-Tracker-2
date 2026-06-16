import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Checkin from './pages/Checkin'
import EOD from './pages/EOD'
import AISummary from './pages/AISummary'
import TeamView from './pages/TeamView'

function Layout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">{children}</div>
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
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/" element={<ProtectedRoute><Layout><Navigate to={isAdmin ? "/dashboard" : "/checkin"} replace /></Layout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute adminOnly><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks showAll={false} /></Layout></ProtectedRoute>} />
      <Route path="/all-tasks" element={<ProtectedRoute adminOnly><Layout><Tasks showAll={true} /></Layout></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute adminOnly><Layout><TeamView /></Layout></ProtectedRoute>} />
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
