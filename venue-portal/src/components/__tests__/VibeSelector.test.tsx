import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VibeSelector } from '../VibeSelector'

describe('VibeSelector', () => {
  it('renders all fixed vibe options', () => {
    render(<VibeSelector value={[]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Chill' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wild' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument()
  })

  it('highlights selected vibes', () => {
    render(<VibeSelector value={['Chill', 'Cozy']} onChange={vi.fn()} />)
    const chillBtn = screen.getByRole('button', { name: 'Chill' })
    expect(chillBtn.className).toContain('bg-[#FF7F61]')
    const wildBtn = screen.getByRole('button', { name: 'Wild' })
    expect(wildBtn.className).not.toContain('bg-[#FF7F61]')
  })

  it('calls onChange with vibe added when unselected vibe is clicked', () => {
    const onChange = vi.fn()
    render(<VibeSelector value={['Chill']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Social' }))
    expect(onChange).toHaveBeenCalledWith(['Chill', 'Social'])
  })

  it('calls onChange with vibe removed when selected vibe is clicked', () => {
    const onChange = vi.fn()
    render(<VibeSelector value={['Chill', 'Social']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chill' }))
    expect(onChange).toHaveBeenCalledWith(['Social'])
  })

  it('shows custom text input when Other is clicked', () => {
    render(<VibeSelector value={[]} onChange={vi.fn()} />)
    expect(screen.queryByLabelText(/custom vibe/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Other' }))
    expect(screen.getByLabelText(/custom vibe/i)).toBeInTheDocument()
  })

  it('adds freeform text to value when typed into Other input', () => {
    const onChange = vi.fn()
    render(<VibeSelector value={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Other' }))
    fireEvent.change(screen.getByLabelText(/custom vibe/i), { target: { value: 'Hipster' } })
    expect(onChange).toHaveBeenCalledWith(['Hipster'])
  })

  it('removes freeform text from value when Other is toggled off', () => {
    const onChange = vi.fn()
    render(<VibeSelector value={['Chill']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Other' }))
    fireEvent.change(screen.getByLabelText(/custom vibe/i), { target: { value: 'Hipster' } })
    // toggle Other off
    fireEvent.click(screen.getByRole('button', { name: 'Other' }))
    expect(onChange).toHaveBeenLastCalledWith(['Chill'])
  })

  it('pre-populates Other input when value contains a non-fixed vibe', () => {
    render(<VibeSelector value={['Chill', 'Hipster']} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/custom vibe/i)).toHaveValue('Hipster')
  })
})
