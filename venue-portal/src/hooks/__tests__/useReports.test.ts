import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useReports } from '../useReports'

const { mockUpsert, mockOrder, mockFrom, mockStorageFrom } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockOrder: vi.fn(),
  mockFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}))

// Mock jspdf so it doesn't try to render a real PDF in tests
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    setFillColor: vi.fn(),
    rect: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob()),
  })),
}))

// Build a fully chainable + thenable query mock
function makeChain(resolvedData: unknown) {
  const resolved = Promise.resolve(resolvedData)
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'not', 'gte', 'lte', 'is', 'gt', 'insert', 'single']
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
  // use shared mockUpsert so tests can assert on it
  chain['upsert'] = mockUpsert.mockReturnValue(chain)
  // order is tracked separately
  chain['order'] = mockOrder.mockReturnValue(chain)
  chain['then'] = resolved.then.bind(resolved)
  chain['catch'] = resolved.catch.bind(resolved)
  return chain
}

describe('useReports — settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'venue_report_settings') {
        return makeChain({ data: { venue_id: 'venue-1', email_enabled: true, delivery_day: 1 }, error: null })
      }
      // venue_reports
      return makeChain({ data: [], error: null })
    })
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/report.pdf' }, error: null }),
    })
  })

  it('loads settings on mount', async () => {
    const { result } = renderHook(() => useReports('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings.email_enabled).toBe(true)
    expect(result.current.settings.delivery_day).toBe(1)
  })
})

describe('useReports — report list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation(() =>
      makeChain({ data: [], error: null })
    )
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: '' }, error: null }),
    })
  })

  it('queries reports sorted newest first', async () => {
    const { result } = renderHook(() => useReports('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockOrder).toHaveBeenCalledWith('report_month', { ascending: false })
  })
})

describe('useReports — updateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'venue_reports') return makeChain({ data: [], error: null })
      return makeChain({ data: { venue_id: 'venue-1', email_enabled: true, delivery_day: 1 }, error: null })
    })
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: '' }, error: null }),
    })
  })

  it('calls upsert with the patched settings', async () => {
    const { result } = renderHook(() => useReports('venue-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.updateSettings({ delivery_day: 15 })
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ delivery_day: 15, venue_id: 'venue-1' }),
      expect.anything()
    )
  })
})

describe('useReports — loading', () => {
  it('returns false and zeros when venueId is undefined', async () => {
    const { result } = renderHook(() => useReports(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reports).toHaveLength(0)
  })
})
