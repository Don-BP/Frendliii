import { renderHook } from '@testing-library/react'
import { useCountdown } from '../useCountdown'

// Pin system clock to a fixed reference: 2024-01-15 10:00 UTC
const REF = new Date('2024-01-15T10:00:00Z')

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(REF)
  })
  afterEach(() => vi.useRealTimers())

  it('returns empty label for null input', () => {
    const { result } = renderHook(() => useCountdown(null))
    expect(result.current.label).toBe('')
    expect(result.current.isUrgent).toBe(false)
    expect(result.current.isExpired).toBe(false)
  })

  it('returns "Expired" for past date', () => {
    const past = new Date(REF.getTime() - 1000 * 60 * 60).toISOString()
    const { result } = renderHook(() => useCountdown(past))
    expect(result.current.label).toBe('Expired')
    expect(result.current.isExpired).toBe(true)
  })

  it('returns hours label and isUrgent when < 24h remaining but different day', () => {
    // Jan 16 08:00 — 22h from REF, clearly tomorrow
    const soon = new Date('2024-01-16T08:00:00Z').toISOString()
    const { result } = renderHook(() => useCountdown(soon))
    expect(result.current.label).toBe('22 hours left')
    expect(result.current.isUrgent).toBe(true)
  })

  it('returns days label when > 48h remaining', () => {
    // Jan 19 10:00 — exactly 4 days from REF
    const future = new Date('2024-01-19T10:00:00Z').toISOString()
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current.label).toBe('4 days left')
    expect(result.current.isUrgent).toBe(false)
  })

  it('returns "1 day left" when 24–48h remaining', () => {
    // Jan 16 22:00 — 36h from REF
    const future = new Date('2024-01-16T22:00:00Z').toISOString()
    const { result } = renderHook(() => useCountdown(future))
    expect(result.current.label).toBe('1 day left')
    expect(result.current.isUrgent).toBe(false)
  })

  it('returns "Expires today" for same-day expiry', () => {
    // Use local-time operations to stay on the same calendar day regardless of timezone
    const localMorning = new Date()
    localMorning.setHours(8, 0, 0, 0)
    vi.setSystemTime(localMorning)
    const sameDay = new Date(localMorning.getTime() + 2 * 60 * 60 * 1000) // +2h, same day
    const { result } = renderHook(() => useCountdown(sameDay.toISOString()))
    expect(result.current.label).toBe('Expires today')
    expect(result.current.isUrgent).toBe(true)
  })
})
