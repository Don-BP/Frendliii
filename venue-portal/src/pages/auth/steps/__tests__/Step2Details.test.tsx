import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Step2Details from '../Step2Details'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ update: mockUpdate })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://x/logo' } }),
      })),
    },
  },
}))

describe('Step2Details', () => {
  beforeEach(() => {
    mockUpdate.mockClear()
    mockEq.mockClear()
    mockEq.mockResolvedValue({ error: null })
  })

  it('requires venue name', async () => {
    render(<Step2Details venueId="u1" onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText(/venue name is required/i)).toBeInTheDocument()
  })

  it('truncates description at 300 chars', () => {
    render(<Step2Details venueId="u1" onSuccess={vi.fn()} />)
    const textarea = screen.getByLabelText(/description/i)
    fireEvent.change(textarea, { target: { value: 'a'.repeat(350) } })
    expect((textarea as HTMLTextAreaElement).value).toHaveLength(300)
  })

  it('saves details including peak_hours and vibes, then calls onSuccess', async () => {
    const onSuccess = vi.fn()
    render(<Step2Details venueId="u1" onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/venue name/i), { target: { value: 'Test Venue' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        peak_hours: expect.any(Object),
        vibes: expect.any(Array),
      })
    )
  })

  it('shows error message when save fails', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } })
    render(<Step2Details venueId="u1" onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/venue name/i), { target: { value: 'Test Venue' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText(/db error/i)).toBeInTheDocument()
  })
})
