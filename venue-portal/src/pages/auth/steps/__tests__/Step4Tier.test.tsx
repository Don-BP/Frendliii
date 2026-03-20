import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Step4Tier from '../Step4Tier'

const mockUpdate = vi.fn()
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ update: mockUpdate, eq: vi.fn().mockReturnThis() })),
  },
}))

describe('Step4Tier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('renders three tier cards', () => {
    render(<Step4Tier venueId="u1" onSuccess={vi.fn()} />)
    expect(screen.getByText(/listed partner/i)).toBeInTheDocument()
    expect(screen.getByText(/perks partner/i)).toBeInTheDocument()
    expect(screen.getByText(/premier partner/i)).toBeInTheDocument()
  })

  it('selecting Listed shows Complete Registration button', () => {
    render(<Step4Tier venueId="u1" onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByText(/listed partner/i))
    expect(screen.getByRole('button', { name: /complete registration/i })).toBeInTheDocument()
  })

  it('selecting Perks shows Continue to Payment button', () => {
    render(<Step4Tier venueId="u1" onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByText(/perks partner/i))
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument()
  })

  it('saves tier=listed, payment_status=none on Listed completion', async () => {
    const onSuccess = vi.fn()
    render(<Step4Tier venueId="u1" onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText(/listed partner/i))
    fireEvent.click(screen.getByRole('button', { name: /complete registration/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'listed', tier_payment_status: 'none', registration_step: 4 })
    )
  })

  it('saves tier=perks, payment_status=pending on paid tier selection', async () => {
    const onSuccess = vi.fn()
    render(<Step4Tier venueId="u1" onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText(/perks partner/i))
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'perks', tier_payment_status: 'pending', registration_step: 4 })
    )
  })
})
