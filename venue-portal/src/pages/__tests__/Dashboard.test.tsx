import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Dashboard from '../Dashboard'

const now = new Date()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } }, venue: { tier: 'listed', tier_payment_status: 'none' } }),
}))

const mockRedemptionQuery = vi.fn()
const mockPromotionQuery = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'venue_redemptions') return mockRedemptionQuery()
      if (table === 'venue_promotions') return mockPromotionQuery()
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
    }),
  },
}))

describe('Dashboard', () => {
  beforeEach(() => {
    // venue_redemptions returns data for monthly, all-time, and chart queries
    mockRedemptionQuery.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [{ redeemed_at: now.toISOString() }, { redeemed_at: now.toISOString() }], error: null }),
    })
    mockPromotionQuery.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({ data: [{ id: 'p1' }, { id: 'p2' }], error: null }),
    })
  })

  it('renders the four summary card labels', async () => {
    render(<Dashboard />)
    expect(await screen.findByText(/redemptions this month/i)).toBeInTheDocument()
    expect(screen.getByText(/all-time redemptions/i)).toBeInTheDocument()
    expect(screen.getByText(/active promotions/i)).toBeInTheDocument()
    expect(screen.getByText(/current tier/i)).toBeInTheDocument()
  })

  it('shows upgrade banner for listed tier', async () => {
    render(<Dashboard />)
    expect(await screen.findByText(/upgrade/i)).toBeInTheDocument()
  })
})
