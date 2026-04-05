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
  peak_hours: VenueHours | null
  vibes: string[] | null
  tier: VenueTier
  tier_payment_status: TierPaymentStatus
  staff_pin_hash: string | null
  staff_pin_locked_until: string | null
  staff_pin_fail_count: number
  is_active: boolean
  registration_step: number
  created_at: string
}

export type PromotionStatus = 'draft' | 'active' | 'ended'

export interface VenuePromotion {
  id: string
  venue_id: string
  title: string
  description: string | null
  discount: string
  valid_from: string
  valid_until: string
  status: PromotionStatus
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

// Supabase Database generic type.
// Row/Insert/Update are intersected with Record<string, unknown> so they satisfy
// GenericTable in @supabase/postgrest-js (which requires an index signature).
export type Database = {
  public: {
    Tables: {
      venues: {
        Row: Venue & Record<string, unknown>
        Insert: Partial<Venue> & Record<string, unknown>
        Update: Partial<Venue> & Record<string, unknown>
        Relationships: []
      }
      venue_promotions: {
        Row: VenuePromotion & Record<string, unknown>
        Insert: Partial<VenuePromotion> & Record<string, unknown>
        Update: Partial<VenuePromotion> & Record<string, unknown>
        Relationships: []
      }
      venue_redemptions: {
        Row: VenueRedemption & Record<string, unknown>
        Insert: Partial<VenueRedemption> & Record<string, unknown>
        Update: Partial<VenueRedemption> & Record<string, unknown>
        Relationships: []
      }
    }
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
  }
}
