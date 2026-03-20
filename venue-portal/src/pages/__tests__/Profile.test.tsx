import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Profile from '../Profile'

const mockUpdateVenue = vi.fn().mockResolvedValue(undefined)
let mockVenueData = {
  id: 'u1', name: 'Test Bar', category: 'bar' as const, phone: '0901234567',
  email: 'test@bar.com', website: 'https://bar.com', description: 'A nice bar',
  lat: 34.6937 as number | null, lng: 135.5023 as number | null, address: 'Osaka', hours: null,
  logo_url: null, cover_url: null, tier: 'listed' as const, tier_payment_status: 'none' as const,
  registration_step: 4, is_active: true, staff_pin_hash: null,
  staff_pin_locked_until: null, staff_pin_fail_count: 0, created_at: '',
}

vi.mock('../../hooks/useVenue', () => ({
  useVenue: () => ({
    venue: mockVenueData,
    loading: false,
    updateVenue: mockUpdateVenue,
  }),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://x/img' } }),
      })),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateVenue.mockResolvedValue(undefined)
    mockVenueData = {
      id: 'u1', name: 'Test Bar', category: 'bar', phone: '0901234567',
      email: 'test@bar.com', website: 'https://bar.com', description: 'A nice bar',
      lat: 34.6937, lng: 135.5023, address: 'Osaka', hours: null,
      logo_url: null, cover_url: null, tier: 'listed', tier_payment_status: 'none',
      registration_step: 4, is_active: true, staff_pin_hash: null,
      staff_pin_locked_until: null, staff_pin_fail_count: 0, created_at: '',
    }
  })

  it('pre-fills form with existing venue data', async () => {
    render(<Profile />)
    expect(await screen.findByDisplayValue('Test Bar')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@bar.com')).toBeInTheDocument()
  })

  it('shows location prompt when lat is null', async () => {
    mockVenueData = { ...mockVenueData, lat: null, lng: null }
    render(<Profile />)
    expect(await screen.findByText(/pin your location/i)).toBeInTheDocument()
  })

  it('renders Save Changes button', async () => {
    render(<Profile />)
    expect(await screen.findByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })
})
