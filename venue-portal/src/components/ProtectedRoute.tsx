import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: React.ReactNode
  ownerOnly?: boolean
}

export function ProtectedRoute({ children, ownerOnly = false }: Props) {
  const { session, venue, loading } = useAuth()

  if (loading) return null

  if (!session) return <Navigate to="/login" replace />

  // For owner-only routes, wait for venue to load before evaluating
  if (ownerOnly && venue === null) return null

  if (ownerOnly && venue && venue.registration_step < 4) {
    const nextStep = venue.registration_step + 1
    return <Navigate to={`/register/${nextStep}`} replace />
  }

  return <>{children}</>
}
