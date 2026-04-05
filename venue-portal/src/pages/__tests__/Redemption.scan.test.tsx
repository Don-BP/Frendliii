import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock QrScanner so camera doesn't activate in tests
vi.mock('../../components/QrScanner', () => ({
  QrScanner: ({ onSuccess }: { onSuccess: (code: string) => void }) => (
    <button data-testid="mock-scanner" onClick={() => onSuccess('ABC234')}>
      Scan
    </button>
  ),
}))

// Mock staffFetch
vi.mock('../../lib/staffAuth', () => ({
  staffFetch: vi.fn().mockResolvedValue({
    status: 'valid',
    promotion_title: 'Test',
    discount: '10%',
    valid_until: '2099-01-01',
  }),
  StaffSessionExpiredError: class StaffSessionExpiredError extends Error {},
}))

import Redemption from '../Redemption'

const renderRedemption = () =>
  render(<MemoryRouter><Redemption /></MemoryRouter>)

describe('Redemption — scan mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Enter Code tab and Scan QR Code tab by default', () => {
    renderRedemption()
    expect(screen.getByText('Enter Code')).toBeTruthy()
    expect(screen.getByText('Scan QR Code')).toBeTruthy()
    expect(screen.getByPlaceholderText('XXXXXX')).toBeTruthy()
  })

  it('shows scanner when Scan QR Code tab is clicked', () => {
    renderRedemption()
    fireEvent.click(screen.getByText('Scan QR Code'))
    expect(screen.getByTestId('mock-scanner')).toBeTruthy()
  })

  it('returns to Enter Code tab when Enter Code is clicked', () => {
    renderRedemption()
    fireEvent.click(screen.getByText('Scan QR Code'))
    fireEvent.click(screen.getByText('Enter Code'))
    expect(screen.getByPlaceholderText('XXXXXX')).toBeTruthy()
  })

  it('auto-submits a valid 6-char scan result and leaves scan mode', async () => {
    const { staffFetch } = await import('../../lib/staffAuth')
    renderRedemption()
    fireEvent.click(screen.getByText('Scan QR Code'))
    fireEvent.click(screen.getByTestId('mock-scanner'))
    expect(staffFetch).toHaveBeenCalledWith(
      expect.stringContaining('redeem-coupon'),
      expect.objectContaining({ code: 'ABC234', action: 'check' })
    )
  })
})
