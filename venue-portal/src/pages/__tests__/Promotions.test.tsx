import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Promotions from '../Promotions'

const mockVenue = { id: 'u1', tier: 'perks', tier_payment_status: 'active' }
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } }, venue: mockVenue }),
}))

const mockCreate = vi.fn()
const mockActivate = vi.fn()
const mockEnd = vi.fn()

vi.mock('../../hooks/usePromotions', () => ({
  usePromotions: () => ({
    promotions: [
      {
        id: 'p1', title: 'Happy Hour', discount: 'BOGO drinks',
        valid_from: '2026-01-01T00:00:00Z', valid_until: '2026-12-31T23:59:59Z',
        status: 'active', description: null, created_at: '',
      },
    ],
    loading: false,
    activeCount: 1,
    tierLimit: 2,
    canActivate: true,
    createPromotion: mockCreate,
    updatePromotion: vi.fn(),
    activatePromotion: mockActivate,
    endPromotion: mockEnd,
  }),
}))

vi.mock('../../components/TierGate', () => ({
  TierGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('Promotions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue(undefined)
    mockActivate.mockResolvedValue(undefined)
    mockEnd.mockResolvedValue(undefined)
  })

  it('renders existing promotions', () => {
    render(<Promotions />)
    expect(screen.getByText('Happy Hour')).toBeInTheDocument()
    expect(screen.getByText('BOGO drinks')).toBeInTheDocument()
  })

  it('opens the PromotionForm when New Promotion clicked', () => {
    render(<Promotions />)
    fireEvent.click(screen.getByRole('button', { name: /new promotion/i }))
    expect(screen.getByRole('heading', { name: /new promotion/i })).toBeInTheDocument()
  })

  it('calls createPromotion on form submit', async () => {
    render(<Promotions />)
    fireEvent.click(screen.getByRole('button', { name: /new promotion/i }))
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Flash Sale' } })
    fireEvent.change(screen.getByLabelText(/discount/i), { target: { value: '20%' } })
    fireEvent.change(screen.getByLabelText(/valid from/i), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText(/valid until/i), { target: { value: '2026-09-01' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
  })
})
