import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../ThemeToggle'

const mockToggle = vi.fn()

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: mockToggle }),
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockToggle.mockClear()
  })

  it('renders switch to dark mode button in light mode', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })

  it('calls toggleTheme when clicked', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))
    expect(mockToggle).toHaveBeenCalledOnce()
  })
})
