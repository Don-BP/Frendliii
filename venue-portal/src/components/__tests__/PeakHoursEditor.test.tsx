import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PeakHoursEditor, DEFAULT_PEAK_HOURS } from '../PeakHoursEditor'

describe('PeakHoursEditor', () => {
  it('renders 7 day rows', () => {
    render(<PeakHoursEditor value={DEFAULT_PEAK_HOURS} onChange={vi.fn()} />)
    expect(screen.getAllByRole('row')).toHaveLength(7)
  })

  it('all days start with time inputs disabled (no peak period by default)', () => {
    render(<PeakHoursEditor value={DEFAULT_PEAK_HOURS} onChange={vi.fn()} />)
    const timeInputs = screen.getAllByDisplayValue(/^\d{2}:\d{2}$/)
    timeInputs.forEach(input => expect(input).toBeDisabled())
  })

  it('enabling a day calls onChange with closed: false for that day', () => {
    const onChange = vi.fn()
    render(<PeakHoursEditor value={DEFAULT_PEAK_HOURS} onChange={onChange} />)
    const monCheckbox = screen.getByLabelText(/mon has peak hours/i)
    fireEvent.click(monCheckbox)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mon: expect.objectContaining({ closed: false }) })
    )
  })

  it('shows "Busy" label for an active day and "Off" for an inactive day', () => {
    const hours = {
      ...DEFAULT_PEAK_HOURS,
      fri: { open: '21:00', close: '02:00', closed: false },
    }
    render(<PeakHoursEditor value={hours} onChange={vi.fn()} />)
    const friRow = screen.getByRole('row', { name: /fri/i })
    expect(friRow).toHaveTextContent('Busy')
    const monRow = screen.getByRole('row', { name: /mon/i })
    expect(monRow).toHaveTextContent('Off')
  })
})
