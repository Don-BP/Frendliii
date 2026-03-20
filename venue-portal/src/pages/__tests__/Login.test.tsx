import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../Login'

const mockSignIn = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: (...a: unknown[]) => mockSignIn(...a) },
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})

const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }))

describe('Login (owner)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ session: null, venue: null })
  })

  it('renders owner login form by default', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows error on invalid credentials', async () => {
    mockSignIn.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } })
    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@bad.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument()
  })

  it('navigates to dashboard on successful login with complete registration', async () => {
    mockSignIn.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    mockUseAuth.mockReturnValue({ session: { user: { id: 'u1' } }, venue: { registration_step: 4 } })
    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@venue.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })

  it('has a link to register', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /register your venue/i })).toBeInTheDocument()
  })
})
