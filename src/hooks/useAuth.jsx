import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setProfiles([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    await fetchProfiles()
    setLoading(false)
  }

  async function fetchProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, role, created_at')
      .order('name', { ascending: true })
    setProfiles(data || [])
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'member',
        },
      },
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const isAdmin = profile?.role === 'admin'
  const memberProfiles = profiles.filter(p => p.role !== 'admin')

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      profiles,
      memberProfiles,
      loading,
      signIn,
      signUp,
      signOut,
      isAdmin,
      fetchProfile,
      fetchProfiles,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
