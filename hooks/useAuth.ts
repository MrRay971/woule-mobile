import { useState, useEffect } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  role?: string
  status?: string
  avatar_url?: string
}

export interface Ambassadeur {
  id: string
  profile_id: string
  territory?: string
  total_km?: number
  total_points?: number
  type?: string
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ambassadeur, setAmbassadeur] = useState<Ambassadeur | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setAmbassadeur(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (prof) {
        setProfile(prof)
        const { data: amb } = await supabase
          .from('ambassadeurs')
          .select('*')
          .eq('profile_id', userId)
          .single()
        if (amb) setAmbassadeur(amb)
      }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = () => {
    if (user) fetchProfile(user.id)
  }

  return { session, user, profile, ambassadeur, loading, signIn, signOut, refreshProfile }
}
