// venue-portal/src/lib/types.ts

export type VenueCategory =
  | 'cafe' | 'bar' | 'restaurant' | 'bowling_alley'
  | 'karaoke' | 'escape_room' | 'activity_venue' | 'other'

export type VenueTier = 'listed' | 'perks' | 'premier'
export type TierPaymentStatus = 'none' | 'pending' | 'active'

export interface DayHours {
  open: string   // "HH:MM" 24h
  close: string  // "HH:MM" 24h
  closed: boolean
}

export interface VenueHours {
  mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours
  fri: DayHours; sat: DayHours; sun: DayHours
}

export interface Venue {
  id: string
  name: string
  category: VenueCategory
  description: string | null
  address: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
  cover_url: string | null
  hours: VenueHours | null
  tier: VenueTier
  tier_payment_status: TierPaymentStatus
  staff_pin_hash: string | null
  staff_pin_locked_until: string | null
  staff_pin_fail_count: number
  is_active: boolean
  registration_step: number
  created_at: string
}

export interface VenuePromotion {
  id: string
  venue_id: string
  title: string
  description: string | null
  discount: string
  valid_from: string
  valid_until: string
  is_active: boolean
  created_at: string
}

export interface VenueRedemption {
  id: string
  venue_id: string
  promotion_id: string
  code: string
  redeemed_at: string | null
  claimed_at: string
  user_ref: string | null
}

// Supabase Database generic type
export type Database = {
  public: {
    Tables: {
      venues: { Row: Venue; Insert: Partial<Venue>; Update: Partial<Venue> }
      venue_promotions: { Row: VenuePromotion; Insert: Partial<VenuePromotion>; Update: Partial<VenuePromotion> }
      venue_redemptions: { Row: VenueRedemption; Insert: Partial<VenueRedemption>; Update: Partial<VenueRedemption> }
    }
  }
}
