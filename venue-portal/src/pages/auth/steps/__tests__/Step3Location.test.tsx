import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Step3Location from '../Step3Location'
import type { MapLocation } from '../../../../components/MapPicker'

vi.mock('../../../../components/MapPicker', () => ({
  MapPicker: ({ onChange }: { onChange: (l: MapLocation) => void }) => (
    <div>
      <button onClick={() => onChange({ lat: 34.6937, lng: 135.5023, address: 'Osaka' })}>
        Pick Location
      </button>
    </div>
  ),
}))

const mockUpdate = vi.fn()
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ update: mockUpdate, eq: vi.fn().mockReturnThis() })),
  },
}))

describe('Step3Location', () => {
  beforeEach(() => {
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('disables Next button until location is picked', () => {
    render(<Step3Location venueId="u1" onSuccess={vi.fn()} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables Next button after location picked', () => {
    render(<Step3Location venueId="u1" onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByText('Pick Location'))
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })

  it('saves lat, lng, address on submit and calls onSuccess', async () => {
    const onSuccess = vi.fn()
    render(<Step3Location venueId="u1" onSuccess={onSuccess} />)
    fireEvent.click(screen.getByText('Pick Location'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 34.6937, lng: 135.5023, address: 'Osaka' })
    )
  })
})
