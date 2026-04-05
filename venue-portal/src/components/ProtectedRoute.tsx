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

  // Wait for venue to load before checking registration status.
  if (ownerOnly && venue === null) return null

  // Only redirect to the wizard once venue has loaded and registration is incomplete.
  if (ownerOnly && venue !== null && venue.registration_step < 4) {
    const nextStep = venue.registration_step + 1
    return <Navigate to={`/register/${nextStep}`} replace />
  }

  return <>{children}</>
}
