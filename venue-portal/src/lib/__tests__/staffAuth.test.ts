import { describe, it, expect, beforeEach } from 'vitest'
import { staffAuth } from '../staffAuth'

describe('staffAuth', () => {
  beforeEach(() => staffAuth.clear())

  it('returns null token before login', () => {
    expect(staffAuth.getToken()).toBeNull()
    expect(staffAuth.getVenueId()).toBeNull()
  })

  it('stores token and venue_id after setSession', () => {
    staffAuth.setSession('token123', 'venue-abc')
    expect(staffAuth.getToken()).toBe('token123')
    expect(staffAuth.getVenueId()).toBe('venue-abc')
  })

  it('returns null after clear', () => {
    staffAuth.setSession('token123', 'venue-abc')
    staffAuth.clear()
    expect(staffAuth.getToken()).toBeNull()
  })

  it('isAuthenticated returns true when token set', () => {
    staffAuth.setSession('tok', 'v1')
    expect(staffAuth.isAuthenticated()).toBe(true)
  })
})
