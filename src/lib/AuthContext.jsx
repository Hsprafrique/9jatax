import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        // Profile missing — create it fresh with onboarding_done = false
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert({ id: userId, onboarding_done: false })
          .select()
          .single()
        setProfile(newProfile || { id: userId, onboarding_done: false })
      } else {
        setProfile(data)
      }
    } catch (e) {
      // Fallback — treat as needing onboarding
      setProfile({ id: userId, onboarding_done: false })
    }
    setLoading(false)
  }

  async function signIn(email, password) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    } catch {
      return { error: { message: 'Connection error. Check your internet.' } }
    }
  }

  async function signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` }
      })
      return { data, error }
    } catch {
      return { error: { message: 'Connection error. Check your internet.' } }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates })
        .select()
        .single()
      if (!error) setProfile(data)
      return { error }
    } catch {
      return { error: { message: 'Failed to save. Try again.' } }
    }
  }

  // True only when user is logged in AND profile is loaded AND onboarding not done
  const needsOnboarding = !loading && !!user && !!profile && !profile.onboarding_done

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      needsOnboarding,
      signIn, signUp, signOut, updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
