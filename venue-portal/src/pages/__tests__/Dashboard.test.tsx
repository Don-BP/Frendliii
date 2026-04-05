import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from '../Dashboard'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } }, venue: { tier: 'listed', tier_payment_status: 'none' } }),
}))

// Build a fully thenable chainable mock that resolves to { data }
function makeChain(data: unknown[]) {
  const resolved = Promise.resolve({ data })
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'not', 'gte', 'lte', 'is', 'gt']
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
  chain['then'] = resolved.then.bind(resolved)
  chain['catch'] = resolved.catch.bind(resolved)
  return chain
}

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

describe('Dashboard', () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'venue_redemptions') return makeChain([{ redeemed_at: new Date().toISOString(), user_id: 'u1', hangout_id: null }])
      if (table === 'venue_promotions') return makeChain([{ id: 'p1' }, { id: 'p2' }])
      return makeChain([])
    })
  })

  it('renders the primary summary card labels', async () => {
    render(<Dashboard />)
    expect(await screen.findByText(/redemptions this month/i)).toBeInTheDocument()
    expect(screen.getByText(/today/i)).toBeInTheDocument()
    expect(screen.getByText(/this week/i)).toBeInTheDocument()
    expect(screen.getByText(/current tier/i)).toBeInTheDocument()
  })

  it('renders the secondary stat labels', async () => {
    render(<Dashboard />)
    expect(await screen.findByText(/new visitors/i)).toBeInTheDocument()
    expect(screen.getByText(/returning visitors/i)).toBeInTheDocument()
    expect(screen.getByText(/30-day return rate/i)).toBeInTheDocument()
  })

  it('shows upgrade banner for listed tier', async () => {
    render(<Dashboard />)
    expect(await screen.findByText(/upgrade/i)).toBeInTheDocument()
  })
})
