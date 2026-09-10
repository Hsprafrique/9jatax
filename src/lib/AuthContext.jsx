import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const [profileRes, subRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      ])
      if (profileRes.error || !profileRes.data) {
        const { data: np } = await supabase.from('profiles').upsert({ id: userId, onboarding_done: false }).select().single()
        setProfile(np || { id: userId, onboarding_done: false })
      } else {
        setProfile(profileRes.data)
      }
      setSubscription(subRes.data || null)
    } catch { setProfile({ id: userId, onboarding_done: false }) }
    setLoading(false)
  }

  async function refreshSubscription() {
    if (!user) return
    const { data } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
    setSubscription(data || null)
  }

  async function signIn(email, password) {
    try { return await supabase.auth.signInWithPassword({ email, password }) }
    catch { return { error: { message: 'Connection error. Check your internet.' } } }
  }
  async function signUp(email, password) {
    try { return await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } }) }
    catch { return { error: { message: 'Connection error. Check your internet.' } } }
  }
  async function signOut() { await supabase.auth.signOut() }
  async function updateProfile(updates) {
    try {
      const { data, error } = await supabase.from('profiles').upsert({ id: user.id, ...updates }).select().single()
      if (!error) setProfile(data)
      return { error }
    } catch { return { error: { message: 'Failed to save.' } } }
  }

  const needsOnboarding = !loading && !!user && !!profile && !profile.onboarding_done

  return (
    <AuthContext.Provider value={{ user, profile, subscription, loading, needsOnboarding, signIn, signUp, signOut, updateProfile, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
