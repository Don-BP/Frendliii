import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StaffPinSection } from '../Profile'
import type { Venue } from '../../lib/types'

const mockVenue: Partial<Venue> = {
  id: 'u1', staff_pin_hash: null, staff_pin_fail_count: 0, staff_pin_locked_until: null,
}

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' }, access_token: 'owner-jwt' } }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('StaffPinSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })
  })

  it('rejects PIN shorter than 4 digits', async () => {
    render(<StaffPinSection venueId="u1" venue={mockVenue as Venue} />)
    const [pinInput] = document.querySelectorAll('input[type="password"]')
    fireEvent.change(pinInput, { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: /set pin/i }))
    expect(await screen.findByText(/4 digits/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects mismatched PINs', async () => {
    render(<StaffPinSection venueId="u1" venue={mockVenue as Venue} />)
    const [pinInput, confirmInput] = document.querySelectorAll('input[type="password"]')
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.change(confirmInput, { target: { value: '5678' } })
    fireEvent.click(screen.getByRole('button', { name: /set pin/i }))
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls update-staff-pin Edge Function with Authorization header on valid PIN', async () => {
    render(<StaffPinSection venueId="u1" venue={mockVenue as Venue} />)
    const [pinInput, confirmInput] = document.querySelectorAll('input[type="password"]')
    fireEvent.change(pinInput, { target: { value: '9876' } })
    fireEvent.change(confirmInput, { target: { value: '9876' } })
    fireEvent.click(screen.getByRole('button', { name: /set pin/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('update-staff-pin'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer owner-jwt' }),
        body: expect.stringContaining('"new_pin":"9876"'),
      })
    ))
  })

  it('shows lockout warning when staff_pin_locked_until is in the future', () => {
    const lockedVenue = { ...mockVenue, staff_pin_locked_until: new Date(Date.now() + 300_000).toISOString() }
    render(<StaffPinSection venueId="u1" venue={lockedVenue as Venue} />)
    expect(screen.getByText(/locked/i)).toBeInTheDocument()
  })
})
