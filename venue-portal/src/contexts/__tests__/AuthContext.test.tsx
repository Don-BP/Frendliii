import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}))

function TestConsumer() {
  const { session, venue, loading } = useAuth()
  if (loading) return <div>loading</div>
  return (
    <div>
      <span data-testid="session">{session ? 'has-session' : 'no-session'}</span>
      <span data-testid="venue">{venue ? venue.name : 'no-venue'}</span>
    </div>
  )
}

describe('AuthContext', () => {
  it('provides null session and venue when unauthenticated', async () => {
    await act(async () => {
      render(<AuthProvider><TestConsumer /></AuthProvider>)
    })
    expect(screen.getByTestId('session').textContent).toBe('no-session')
    expect(screen.getByTestId('venue').textContent).toBe('no-venue')
  })
})
