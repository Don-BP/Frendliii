import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Venue } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  venue: Venue | null
  loading: boolean
  refreshVenue: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  venue: null,
  loading: true,
  refreshVenue: async () => {},
  signIn: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchVenue = async (userId: string) => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('[AuthContext] fetchVenue failed:', error.message)
    }
    setVenue(data ?? null)
  }

  const refreshVenue = async () => {
    if (session?.user?.id) await fetchVenue(session.user.id)
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      throw new Error(error?.message ?? 'Login failed.')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchVenue(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchVenue(session.user.id)
        } else {
          setVenue(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, venue, loading, refreshVenue, signIn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
