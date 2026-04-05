import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QrScanner } from '../QrScanner'

const { mockRender, mockClear, MockScanner } = vi.hoisted(() => {
  const mockRender = vi.fn()
  const mockClear = vi.fn().mockResolvedValue(undefined)
  const MockScanner = vi.fn(function (this: Record<string, unknown>) {
    this.render = mockRender
    this.clear = mockClear
  })
  return { mockRender, mockClear, MockScanner }
})

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: MockScanner,
}))

describe('QrScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the scanner container', () => {
    render(<QrScanner onSuccess={vi.fn()} />)
    expect(document.getElementById('qr-reader')).toBeTruthy()
  })

  it('initialises Html5QrcodeScanner on mount', () => {
    render(<QrScanner onSuccess={vi.fn()} />)
    expect(MockScanner).toHaveBeenCalledWith(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )
    expect(mockRender).toHaveBeenCalledTimes(1)
  })

  it('calls onSuccess with decoded text when scan succeeds', () => {
    const onSuccess = vi.fn()
    render(<QrScanner onSuccess={onSuccess} />)
    // Simulate a successful scan by calling the first arg passed to render()
    const [successCb] = mockRender.mock.calls[0]
    successCb('ABC123')
    expect(onSuccess).toHaveBeenCalledWith('ABC123')
  })

  it('calls scanner.clear() on unmount', () => {
    const { unmount } = render(<QrScanner onSuccess={vi.fn()} />)
    unmount()
    expect(mockClear).toHaveBeenCalledTimes(1)
  })
})
