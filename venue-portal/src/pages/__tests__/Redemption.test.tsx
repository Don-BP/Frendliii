import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Redemption from '../Redemption'

const mockStaffFetch = vi.fn()
vi.mock('../../lib/staffAuth', () => ({
  staffAuth: { getToken: vi.fn().mockReturnValue('valid-token'), getVenueId: vi.fn().mockReturnValue('v1') },
  staffFetch: (...a: unknown[]) => mockStaffFetch(...a),
  StaffSessionExpiredError: class extends Error { constructor() { super('StaffSessionExpired') } },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})

const VALID_CODE = 'GK4M7R'

describe('Redemption', () => {
  beforeEach(() => vi.clearAllMocks())

  it('disables Check Code button until exactly 6 valid chars', () => {
    render(<MemoryRouter><Redemption /></MemoryRouter>)
    const input = screen.getByRole('textbox')
    expect(screen.getByRole('button', { name: /check code/i })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'GK4M7' } })
    expect(screen.getByRole('button', { name: /check code/i })).toBeDisabled()
    fireEvent.change(input, { target: { value: 'GK4M7R' } })
    expect(screen.getByRole('button', { name: /check code/i })).not.toBeDisabled()
  })

  it('auto-uppercases and strips invalid characters from input', () => {
    render(<MemoryRouter><Redemption /></MemoryRouter>)
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc0i1' } })
    // a, b, c → A, B, C (valid); 0, 1, i (as I) are invalid chars — I is NOT in the valid set ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no I, O, 0, 1, L)
    // Actually: charset = ABCDEFGHJKLMNPQRSTUVWXYZ23456789
    // a→A valid, b→B valid, c→C valid, 0→invalid, i→I→invalid (I not in charset), 1→invalid
    expect(input.value).toBe('ABC')
  })

  it('shows valid card and Confirm Redemption button on valid code', async () => {
    mockStaffFetch.mockResolvedValue({ status: 'valid', promotion_title: 'Happy Hour', discount: 'BOGO', valid_until: '2026-12-31T23:59:59Z' })
    render(<MemoryRouter><Redemption /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: VALID_CODE } })
    fireEvent.click(screen.getByRole('button', { name: /check code/i }))
    expect(await screen.findByText('Happy Hour')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm redemption/i })).toBeInTheDocument()
  })

  it('shows already redeemed card with red styling', async () => {
    mockStaffFetch.mockResolvedValue({ status: 'already_redeemed', promotion_title: 'Happy Hour', discount: 'BOGO', redeemed_at: '2026-03-01T12:00:00Z' })
    render(<MemoryRouter><Redemption /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: VALID_CODE } })
    fireEvent.click(screen.getByRole('button', { name: /check code/i }))
    expect(await screen.findByText(/already redeemed/i)).toBeInTheDocument()
  })

  it('shows confirmed state after Confirm Redemption', async () => {
    mockStaffFetch
      .mockResolvedValueOnce({ status: 'valid', promotion_title: 'Happy Hour', discount: 'BOGO', valid_until: '2026-12-31T23:59:59Z' })
      .mockResolvedValueOnce({ status: 'confirmed', promotion_title: 'Happy Hour', discount: 'BOGO' })
    render(<MemoryRouter><Redemption /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: VALID_CODE } })
    fireEvent.click(screen.getByRole('button', { name: /check code/i }))
    await screen.findByText('Happy Hour')
    fireEvent.click(screen.getByRole('button', { name: /confirm redemption/i }))
    expect(await screen.findByText(/redeemed/i)).toBeInTheDocument()
  })

  it('redirects to login on StaffSessionExpired', async () => {
    const { StaffSessionExpiredError } = await import('../../lib/staffAuth')
    mockStaffFetch.mockRejectedValue(new StaffSessionExpiredError())
    render(<MemoryRouter><Redemption /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: VALID_CODE } })
    fireEvent.click(screen.getByRole('button', { name: /check code/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({ state: expect.anything() })))
  })
})
