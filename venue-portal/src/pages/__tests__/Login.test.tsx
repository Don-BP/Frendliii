import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mockResetPasswordForEmail = vi.fn()
const mockSignIn = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      signInWithPassword: vi.fn(),
    },
  },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn, session: null }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Lazy import after mocks
let Login: React.ComponentType
beforeEach(async () => {
  vi.clearAllMocks()
  mockResetPasswordForEmail.mockResolvedValue({ error: null })
  const mod = await import('../Login')
  Login = mod.default as React.ComponentType
})

describe('Login — forgot password', () => {
  it('shows reset sent message after forgot password clicked with email', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    await userEvent.type(screen.getByRole('textbox', { name: /email/i }), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', expect.any(Object))
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows error if forgot password clicked without email', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
