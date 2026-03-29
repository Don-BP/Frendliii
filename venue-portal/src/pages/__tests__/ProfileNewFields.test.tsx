import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Profile from '../Profile'

const mockUpdateVenue = vi.fn().mockResolvedValue(undefined)

const mockVenue = {
  id: 'u1', name: 'Test Venue', category: 'bar', phone: '', email: '',
  website: '', description: '', hours: null, peak_hours: null, vibes: ['Chill'],
  lat: null, lng: null, address: null, logo_url: null, cover_url: null,
  tier: 'perks', tier_payment_status: 'active', is_active: true,
  registration_step: 4, staff_pin_hash: null, staff_pin_locked_until: null,
  staff_pin_fail_count: 0, created_at: '',
}

vi.mock('../../hooks/useVenue', () => ({
  useVenue: () => ({
    loading: false,
    venue: mockVenue,
    updateVenue: mockUpdateVenue,
  }),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' }, access_token: 'tok' }, venue: null, loading: false }),
}))

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://x/img' } }),
      })),
    },
  },
}))

describe('Profile new fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateVenue.mockResolvedValue(undefined)
  })

  it('renders the peak hours section', () => {
    render(<Profile />)
    expect(screen.getByText(/peak hours/i)).toBeInTheDocument()
  })

  it('renders the vibe section with existing vibes pre-selected', () => {
    render(<Profile />)
    const chillBtn = screen.getByRole('button', { name: 'Chill' })
    expect(chillBtn.className).toContain('bg-[#FF7F61]')
  })

  it('includes peak_hours and vibes in the save payload', async () => {
    render(<Profile />)
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledWith(
      expect.objectContaining({
        peak_hours: expect.any(Object),
        vibes: expect.any(Array),
      })
    ))
  })
})
