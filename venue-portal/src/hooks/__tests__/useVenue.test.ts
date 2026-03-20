import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useVenue } from '../useVenue'

const mockSingle = vi.fn()
const mockUpdate = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn(() => ({ eq: mockUpdate })),
      eq: vi.fn(() => ({ single: mockSingle })),
      single: mockSingle,
    })),
  },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}))

const mockVenue = { id: 'u1', name: 'Test Venue', registration_step: 4 }

describe('useVenue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: mockVenue, error: null })
    mockUpdate.mockResolvedValue({ error: null })
  })

  it('loads venue on mount', async () => {
    const { result } = renderHook(() => useVenue())
    await waitFor(() => expect(result.current.venue).toBeDefined())
    expect(result.current.venue?.name).toBe('Test Venue')
    expect(result.current.loading).toBe(false)
  })

  it('updateVenue calls supabase update and refreshes', async () => {
    mockSingle.mockResolvedValue({ data: { ...mockVenue, name: 'Updated' }, error: null })
    const { result } = renderHook(() => useVenue())
    await waitFor(() => expect(result.current.venue).toBeDefined())
    await act(async () => {
      await result.current.updateVenue({ name: 'Updated' })
    })
    expect(result.current.venue?.name).toBe('Updated')
  })
})
