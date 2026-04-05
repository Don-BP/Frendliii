import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { VenuePromotion } from '../lib/types'

type Tier = 'listed' | 'perks' | 'premier'

const TIER_LIMITS: Record<Tier, number> = {
  listed: 0,
  perks: 2,
  premier: 4,
}

type CreateInput = Pick<VenuePromotion, 'title' | 'discount' | 'valid_from' | 'valid_until'> & {
  description?: string | null
}

interface PromotionsHook {
  loading: boolean
  promotions: VenuePromotion[]
  activeCount: number
  tierLimit: number
  canActivate: boolean
  createPromotion: (data: CreateInput) => Promise<void>
  updatePromotion: (id: string, data: Partial<CreateInput>) => Promise<void>
  activatePromotion: (id: string) => Promise<void>
  endPromotion: (id: string) => Promise<void>
}

export function usePromotions(venueId: string | undefined, tier: Tier = 'listed'): PromotionsHook {
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState<VenuePromotion[]>([])

  const tierLimit = TIER_LIMITS[tier]
  const activeCount = promotions.filter(
    p => p.status === 'active' && new Date(p.valid_until) > new Date()
  ).length
  const canActivate = activeCount < tierLimit

  useEffect(() => {
    if (!venueId) { setLoading(false); return }

    supabase
      .from('venue_promotions')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPromotions((data ?? []) as VenuePromotion[])
        setLoading(false)
      })
  }, [venueId])

  const createPromotion = useCallback(async (data: CreateInput) => {
    if (!venueId) return
    const { data: created } = await supabase
      .from('venue_promotions')
      .insert({ ...data, venue_id: venueId, status: 'draft' })
      .select()
      .single()
    if (created) setPromotions(prev => [created as VenuePromotion, ...prev])
  }, [venueId])

  const updatePromotion = useCallback(async (id: string, data: Partial<CreateInput>) => {
    await supabase.from('venue_promotions').update(data).eq('id', id)
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }, [])

  const activatePromotion = useCallback(async (id: string) => {
    if (!canActivate) throw new Error(`You've reached your ${tierLimit} active promotion limit`)
    await supabase.from('venue_promotions').update({ status: 'active' }).eq('id', id)
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p))
  }, [canActivate, tierLimit])

  const endPromotion = useCallback(async (id: string) => {
    await supabase.from('venue_promotions').update({ status: 'ended' }).eq('id', id)
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: 'ended' } : p))
  }, [])

  return { loading, promotions, activeCount, tierLimit, canActivate, createPromotion, updatePromotion, activatePromotion, endPromotion }
}
