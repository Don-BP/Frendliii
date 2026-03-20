import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'

const mockUseAuth = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('ProtectedRoute', () => {
  it('redirects to /login when no session', () => {
    mockUseAuth.mockReturnValue({ session: null, venue: null, loading: false })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('redirects to /register/:step when registration incomplete', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'u1' } },
      venue: { registration_step: 2 },
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/register/:step" element={<div>Register Step</div>} />
          <Route path="/dashboard" element={<ProtectedRoute ownerOnly><div>Dashboard</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Register Step')).toBeInTheDocument()
  })

  it('renders children when authenticated and registration complete', () => {
    mockUseAuth.mockReturnValue({
      session: { user: { id: 'u1' } },
      venue: { registration_step: 4 },
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute ownerOnly><div>Dashboard</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
