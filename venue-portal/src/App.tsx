import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Pages — existing pages kept as-is; they will be rebuilt in later plans
import Login from './pages/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Redemption from './pages/Redemption'
import Profile from './pages/Profile'
import Promotions from './pages/Promotions'

// Sidebar imported for now; will be wrapped in Layout in Plan 3
import Sidebar from './components/Sidebar'

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
              <div className="flex h-screen w-full bg-[#0a0f1a] text-slate-200 overflow-hidden">
                <Sidebar role="owner" onLogout={() => {}} />
                <main className="flex-1 overflow-auto"><Dashboard /></main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/redeem"
          element={
            <ProtectedRoute>
              <div className="flex h-screen w-full bg-[#0a0f1a] text-slate-200 overflow-hidden">
                <Sidebar role="owner" onLogout={() => {}} />
                <main className="flex-1 overflow-auto"><Redemption /></main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute ownerOnly>
              <div className="flex h-screen w-full bg-[#0a0f1a] text-slate-200 overflow-hidden">
                <Sidebar role="owner" onLogout={() => {}} />
                <main className="flex-1 overflow-auto"><Profile /></main>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/promotions"
          element={
            <ProtectedRoute ownerOnly>
              <div className="flex h-screen w-full bg-[#0a0f1a] text-slate-200 overflow-hidden">
                <Sidebar role="owner" onLogout={() => {}} />
                <main className="flex-1 overflow-auto"><Promotions /></main>
              </div>
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
