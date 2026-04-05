import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePromotions } from '../usePromotions'

const { mockUpdate, mockOrder } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockOrder: vi.fn(),
}))

function makePromotion(overrides: Partial<{
  id: string; status: string; valid_until: string
}> = {}) {
  return {
    id: 'promo-1',
    venue_id: 'venue-1',
    title: 'Test Promo',
    description: null,
    discount: '10%',
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 86400000).toISOString(),
    coupon_code: 'ABC123',
    status: 'draft',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: mockOrder,
      insert: vi.fn().mockReturnThis(),
      update: mockUpdate,
      single: vi.fn().mockResolvedValue({ data: makePromotion(), error: null }),
    })),
  },
}))

describe('usePromotions — canActivate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrder.mockResolvedValue({ data: [makePromotion()], error: null })
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('canActivate is true when activeCount < tierLimit for perks tier', async () => {
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    // 0 active promotions (only draft), perks limit = 2 → canActivate = true
    expect(result.current.canActivate).toBe(true)
  })

  it('canActivate is false when activeCount >= tierLimit', async () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    mockOrder.mockResolvedValue({
      data: [
        makePromotion({ id: 'p1', status: 'active', valid_until: future }),
        makePromotion({ id: 'p2', status: 'active', valid_until: future }),
      ],
      error: null,
    })
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canActivate).toBe(false)
  })
})

describe('usePromotions — activatePromotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrder.mockResolvedValue({ data: [makePromotion()], error: null })
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('calls update with status=active', async () => {
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.activatePromotion('promo-1')
    })

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'active' })
  })

  it('throws when canActivate is false', async () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    mockOrder.mockResolvedValue({
      data: [
        makePromotion({ id: 'p1', status: 'active', valid_until: future }),
        makePromotion({ id: 'p2', status: 'active', valid_until: future }),
      ],
      error: null,
    })
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => { await result.current.activatePromotion('promo-1') })
    ).rejects.toThrow('active promotion limit')
  })
})

describe('usePromotions — endPromotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOrder.mockResolvedValue({ data: [makePromotion()], error: null })
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('calls update with status=ended', async () => {
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.endPromotion('promo-1')
    })

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'ended' })
  })
})

describe('usePromotions — loading', () => {
  it('returns loading=false when venueId is undefined', async () => {
    const { result } = renderHook(() => usePromotions(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.promotions).toHaveLength(0)
  })
})
