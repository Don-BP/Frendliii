import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePromotions } from '../usePromotions'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))

const mockPromos = [
  { id: 'p1', venue_id: 'u1', title: '10% Off', discount: '10%', valid_from: '2026-01-01T00:00:00Z', valid_until: '2026-12-31T23:59:59Z', is_active: true, description: null, created_at: '' },
]

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdateChain = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: vi.fn(() => ({ eq: mockUpdateChain })),
    })),
  },
}))

describe('usePromotions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockPromos, error: null }),
    })
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPromos[0], error: null }),
    })
    mockUpdateChain.mockResolvedValue({ error: null })
  })

  it('loads promotions on mount', async () => {
    const { result } = renderHook(() => usePromotions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.promotions).toHaveLength(1)
    expect(result.current.promotions[0].title).toBe('10% Off')
  })

  it('createPromotion inserts and refreshes', async () => {
    const { result } = renderHook(() => usePromotions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.createPromotion({
        title: 'New', discount: '20%', valid_from: '2026-03-01T00:00:00Z', valid_until: '2026-04-01T00:00:00Z',
      })
    })
    expect(mockInsert).toHaveBeenCalled()
  })

  it('togglePromotion updates is_active', async () => {
    const { result } = renderHook(() => usePromotions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.togglePromotion('p1', false)
    })
    expect(mockUpdateChain).toHaveBeenCalled()
  })
})
