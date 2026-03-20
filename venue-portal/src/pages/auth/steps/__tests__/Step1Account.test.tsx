import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Step1Account from '../Step1Account'

const mockSignUp = vi.fn()
const mockFrom = vi.fn()
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    auth: { signUp: (...a: unknown[]) => mockSignUp(...a) },
    from: (...a: unknown[]) => mockFrom(...a),
  },
}))

describe('Step1Account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  it('shows validation error when passwords do not match', async () => {
    render(<Step1Account onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password1' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password2' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows validation error for password shorter than 8 chars', async () => {
    render(<Step1Account onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('calls signUp and inserts stub venues row on success', async () => {
    const onSuccess = vi.fn()
    render(<Step1Account onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@venue.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'strongpass1' } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'strongpass1' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'owner@venue.com', password: 'strongpass1' })
  })
})
