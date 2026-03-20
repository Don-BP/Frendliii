import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Venue } from '../lib/types'

export function useVenue() {
  const { session } = useAuth()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVenue = useCallback(async () => {
    if (!session?.user?.id) return
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (error) setError(error.message)
    else setVenue(data)
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => { fetchVenue() }, [fetchVenue])

  const updateVenue = async (patch: Partial<Venue>) => {
    if (!session?.user?.id) return
    const { error } = await supabase
      .from('venues')
      .update(patch)
      .eq('id', session.user.id)
    if (error) throw new Error(error.message)
    await fetchVenue()
  }

  return { venue, loading, error, updateVenue, refetch: fetchVenue }
}
