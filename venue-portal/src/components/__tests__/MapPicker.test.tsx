// No VITE_GOOGLE_MAPS_API_KEY set in test env → text fallback
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapPicker } from '../MapPicker'

describe('MapPicker (text fallback — no API key)', () => {
  it('renders address text input when no API key', () => {
    render(<MapPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: /address/i })).toBeInTheDocument()
  })

  it('shows the no-map-key banner', () => {
    render(<MapPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByText(/interactive map will be enabled/i)).toBeInTheDocument()
  })

  it('calls onChange with lat:null, lng:null and the typed address', () => {
    const onChange = vi.fn()
    render(<MapPicker value={null} onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: /address/i })
    fireEvent.change(input, { target: { value: 'Osaka Station' } })
    expect(onChange).toHaveBeenCalledWith({ lat: null, lng: null, address: 'Osaka Station' })
  })

  it('displays current value address in the input', () => {
    render(<MapPicker value={{ lat: null, lng: null, address: 'Tokyo' }} onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Tokyo')).toBeInTheDocument()
  })
})
