import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

// Pages — existing pages kept as-is; they will be rebuilt in later plans
import Login from './pages/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Redemption from './pages/Redemption'
import Profile from './pages/Profile'
import Promotions from './pages/Promotions'

// Login is a prototype page with an onLogin prop; it will be rebuilt in Plan 2.
// Cast to any to avoid TypeScript errors from the legacy signature.
const LoginPage = Login as React.ComponentType

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Register wizard routes — added in Plan 2 */}
        <Route path="/register/:step" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute ownerOnly>
              <Layout role="owner">
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/redeem"
          element={
            <ProtectedRoute>
              <Layout role="owner">
                <Redemption />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute ownerOnly>
              <Layout role="owner">
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions"
          element={
            <ProtectedRoute ownerOnly>
              <Layout role="owner">
                <Promotions />
              </Layout>
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
