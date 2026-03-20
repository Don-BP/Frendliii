import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { VenuePromotion } from '../lib/types'

type CreateInput = Pick<VenuePromotion, 'title' | 'discount' | 'valid_from' | 'valid_until'> & {
  description?: string | null
}

export function usePromotions() {
  const { session } = useAuth()
  const venueId = session?.user?.id
  const [promotions, setPromotions] = useState<VenuePromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPromotions = useCallback(async () => {
    if (!venueId) return
    const { data, error } = await supabase
      .from('venue_promotions')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setPromotions(data ?? [])
    setLoading(false)
  }, [venueId])

  useEffect(() => { fetchPromotions() }, [fetchPromotions])

  const createPromotion = async (input: CreateInput) => {
    if (!venueId) throw new Error('Not authenticated')
    const { error } = await supabase
      .from('venue_promotions')
      .insert({ ...input, venue_id: venueId, is_active: true })
      .select()
      .single()
    if (error) throw new Error(error.message)
    await fetchPromotions()
  }

  const updatePromotion = async (id: string, patch: Partial<VenuePromotion>) => {
    const { error } = await supabase
      .from('venue_promotions')
      .update(patch)
      .eq('id', id)
    if (error) throw new Error(error.message)
    await fetchPromotions()
  }

  const togglePromotion = async (id: string, isActive: boolean) => {
    await updatePromotion(id, { is_active: isActive })
  }

  return { promotions, loading, error, createPromotion, updatePromotion, togglePromotion }
}
