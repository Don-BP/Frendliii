import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Step2Details from '../Step2Details'

const mockUpdate = vi.fn()
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(() => ({ update: mockUpdate, eq: vi.fn().mockReturnThis() })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://x/logo' } })
      }))
    },
  },
}))

describe('Step2Details', () => {
  beforeEach(() => {
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  it('requires venue name', async () => {
    render(<Step2Details venueId="u1" onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByText(/venue name is required/i)).toBeInTheDocument()
  })

  it('truncates description at 300 chars', () => {
    render(<Step2Details venueId="u1" onSuccess={vi.fn()} />)
    const textarea = screen.getByLabelText(/description/i)
    const longText = 'a'.repeat(350)
    fireEvent.change(textarea, { target: { value: longText } })
    expect((textarea as HTMLTextAreaElement).value).toHaveLength(300)
  })

  it('saves details and calls onSuccess', async () => {
    const onSuccess = vi.fn()
    render(<Step2Details venueId="u1" onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/venue name/i), { target: { value: 'Test Venue' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })
})
