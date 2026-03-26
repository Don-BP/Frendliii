// venue-portal/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { staffAuth } from './lib/staffAuth'

import Login from './pages/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Redemption from './pages/Redemption'
import Profile from './pages/Profile'
import Promotions from './pages/Promotions'

// Detects staff-only sessions: staffAuth in-memory JWT but no Supabase owner session.
// Must be a component (not inline JSX) so it can call useAuth() inside AuthProvider.
function RedeemRoute() {
  const { session } = useAuth()
  const role = !session && staffAuth.isAuthenticated() ? 'staff' : 'owner'
  return (
    <ProtectedRoute>
      <Layout role={role}>
        <Redemption />
      </Layout>
    </ProtectedRoute>
  )
}

const LoginPage = Login as React.ComponentType

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/:step" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute ownerOnly>
              <Layout role="owner"><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/redeem" element={<RedeemRoute />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute ownerOnly>
              <Layout role="owner"><Profile /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions"
          element={
            <ProtectedRoute ownerOnly>
              <Layout role="owner"><Promotions /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
