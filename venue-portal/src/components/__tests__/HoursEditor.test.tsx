import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HoursEditor } from '../HoursEditor'
import type { VenueHours } from '../../lib/types'

const defaultHours: VenueHours = {
  mon: { open: '09:00', close: '18:00', closed: false },
  tue: { open: '09:00', close: '18:00', closed: false },
  wed: { open: '09:00', close: '18:00', closed: false },
  thu: { open: '09:00', close: '18:00', closed: false },
  fri: { open: '09:00', close: '21:00', closed: false },
  sat: { open: '10:00', close: '21:00', closed: false },
  sun: { open: '10:00', close: '17:00', closed: true },
}

describe('HoursEditor', () => {
  it('renders 7 day rows', () => {
    render(<HoursEditor value={defaultHours} onChange={vi.fn()} />)
    expect(screen.getAllByRole('row')).toHaveLength(7)
  })

  it('calls onChange when closed toggle flipped', () => {
    const onChange = vi.fn()
    render(<HoursEditor value={defaultHours} onChange={onChange} />)
    const monClosedCheckbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(monClosedCheckbox)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mon: expect.objectContaining({ closed: true }) })
    )
  })

  it('shows closed days with disabled time inputs', () => {
    render(<HoursEditor value={defaultHours} onChange={vi.fn()} />)
    // Sunday is closed — its time inputs should be disabled
    const sunRow = screen.getByRole('row', { name: /sun/i })
    const timeInputs = sunRow.querySelectorAll('input[type="time"]')
    timeInputs.forEach(input => expect(input).toBeDisabled())
  })
})
