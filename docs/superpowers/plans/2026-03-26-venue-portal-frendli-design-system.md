# Venue Portal — Frendli Design System Adoption + Feature Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the venue portal with the Frendli brand (coral primary, deep violet secondary, Bricolage Grotesque + Lexend typography, warm card shadows), add light/dark mode with localStorage persistence, and fix three functional gaps (staff Layout role, forgot password, register step guard).

**Architecture:** A `ThemeProvider` (outermost wrapper) reads `localStorage` and applies a `dark` class to `<html>`. Tailwind's `darkMode: 'class'` activates dark variants. All colour and typography changes are applied by replacing Tailwind class strings in each component — no shared utility classes, no CSS-in-JS. The three functional fixes are self-contained: `RedeemRoute` wrapper in App.tsx detects staff-only sessions, Login gets a forgot-password code path, Register.tsx adds a guard redirect.

**Tech Stack:** Vite + React 18 + TypeScript, Tailwind CSS (`darkMode: 'class'`), Lucide-react, Vitest + RTL, Google Fonts (Bricolage Grotesque + Lexend)

**Spec:** `docs/superpowers/specs/2026-03-26-venue-portal-frendli-design-system.md`

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `venue-portal/src/contexts/ThemeContext.tsx` | Theme state, localStorage persistence, `dark` class on `<html>` |
| Create | `venue-portal/src/contexts/__tests__/ThemeContext.test.tsx` | ThemeContext unit tests |
| Create | `venue-portal/src/components/ThemeToggle.tsx` | Sun/moon button; used in Sidebar + Profile |
| Create | `venue-portal/src/components/__tests__/ThemeToggle.test.tsx` | ThemeToggle unit tests |
| Modify | `venue-portal/index.html` | Google Fonts link + update title |
| Modify | `venue-portal/tailwind.config.js` | Frendli tokens, `darkMode: 'class'`, font families |
| Modify | `venue-portal/src/index.css` | Swap body defaults to cream/violet |
| Modify | `venue-portal/src/main.tsx` | Wrap with `ThemeProvider` (outermost) |
| Modify | `venue-portal/src/App.tsx` | Add `RedeemRoute` component (staff role fix) |
| Modify | `venue-portal/src/components/Sidebar.tsx` | Frendli colours, coral active state, ThemeToggle |
| Modify | `venue-portal/src/components/BottomTabBar.tsx` | Frendli colours, coral active state |
| Modify | `venue-portal/src/components/Layout.tsx` | New background tokens |
| Modify | `venue-portal/src/components/StepIndicator.tsx` | Coral steps, fix divider layout |
| Modify | `venue-portal/src/components/TierGate.tsx` | Coral CTA button |
| Modify | `venue-portal/src/components/PromotionForm.tsx` | New input/button styles |
| Modify | `venue-portal/src/pages/Login.tsx` | Frendli card, coral tabs, forgot password |
| Create | `venue-portal/src/pages/__tests__/Login.test.tsx` | Forgot password tests |
| Modify | `venue-portal/src/pages/auth/Register.tsx` | Registration guard + Frendli background |
| Modify | `venue-portal/src/pages/auth/steps/Step1Account.tsx` | Frendli inputs/buttons |
| Modify | `venue-portal/src/pages/auth/steps/Step2Details.tsx` | Frendli inputs/buttons |
| Modify | `venue-portal/src/pages/auth/steps/Step3Location.tsx` | Frendli inputs/buttons |
| Modify | `venue-portal/src/pages/auth/steps/Step4Tier.tsx` | Frendli tier cards/buttons |
| Modify | `venue-portal/src/pages/Dashboard.tsx` | Frendli cards, coral chart + banner |
| Modify | `venue-portal/src/pages/Profile.tsx` | Section cards, Appearance card |
| Modify | `venue-portal/src/pages/Promotions.tsx` | Frendli cards/buttons |
| Modify | `venue-portal/src/pages/Redemption.tsx` | Remove redundant bg, coral buttons |

---

## Shared style strings (reference these in tasks below)

```
INPUT_CLASS = "w-full mt-1 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"

BTN_PRIMARY = "bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"

BTN_GHOST = "border border-[#EEEAE3] dark:border-[#3D2E55] text-[#2D1E4B] dark:text-[#C4B5E8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] font-semibold py-2 rounded-xl transition-colors"

CARD = "bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"

LABEL = "text-sm text-[#8E8271] dark:text-[#9E8FC0]"

HEADING = "font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]"

ACCENT_BAR = "h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6"
```

---

### Task 1: Tailwind config, fonts, CSS, ThemeContext, ThemeToggle, main.tsx

**Files:**
- Modify: `venue-portal/index.html`
- Modify: `venue-portal/tailwind.config.js`
- Modify: `venue-portal/src/index.css`
- Modify: `venue-portal/src/main.tsx`
- Create: `venue-portal/src/contexts/ThemeContext.tsx`
- Create: `venue-portal/src/contexts/__tests__/ThemeContext.test.tsx`
- Create: `venue-portal/src/components/ThemeToggle.tsx`
- Create: `venue-portal/src/components/__tests__/ThemeToggle.test.tsx`

- [ ] **Step 1: Update index.html — add Google Fonts and fix title**

Replace the entire contents of `venue-portal/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Frendli | Venue Partner Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Lexend:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace tailwind.config.js with Frendli design tokens**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF7F61',
        'primary-dark': '#E6684B',
        secondary: '#2D1E4B',
        'secondary-light': '#46326E',
        accent: '#00E5D4',
        cream: '#FFFBF7',
        vanilla: '#FFFAF0',
        sand: '#F5EEE6',
        'warm-border': '#EEEAE3',
        'text-warm': '#8E8271',
        'text-warm-dark': '#9E8FC0',
      },
      fontFamily: {
        bricolage: ['Bricolage Grotesque', 'sans-serif'],
        lexend: ['Lexend', 'sans-serif'],
      },
      boxShadow: {
        'warm-sm': '0 2px 4px rgba(45,30,75,0.04)',
        'warm-md': '0 8px 12px rgba(45,30,75,0.08)',
        'warm-card': '0 4px 20px rgba(45,30,75,0.05)',
        coral: '0 4px 16px rgba(255,127,97,0.35)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Update src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    background-color: #FFFBF7;
    color: #2D1E4B;
    font-family: 'Lexend', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .dark body {
    background-color: #1A1225;
    color: #F0EBF8;
  }
}

@layer utilities {
  .animate-in {
    animation-fill-mode: both;
  }
  .fade-in {
    animation: fadeIn var(--tw-duration, 300ms) ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
```

- [ ] **Step 4: Write the failing ThemeContext test**

```typescript
// venue-portal/src/contexts/__tests__/ThemeContext.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '../ThemeContext'

function TestConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('defaults to light theme', () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggleTheme switches to dark and persists to localStorage', async () => {
    render(<ThemeProvider><TestConsumer /></ThemeProvider>)
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('frendli-theme')).toBe('dark')
  })

  it('reads dark theme from localStorage on init', () => {
    localStorage.setItem('frendli-theme', 'dark')
    render(<ThemeProvider><TestConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
```

- [ ] **Step 5: Run ThemeContext test — expect FAIL**

```bash
cd venue-portal && npm test src/contexts/__tests__/ThemeContext.test.tsx
```
Expected: FAIL — "Cannot find module '../ThemeContext'"

- [ ] **Step 6: Create ThemeContext.tsx**

```typescript
// venue-portal/src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
})

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('frendli-theme') as Theme | null
    const initial = stored === 'dark' ? 'dark' : 'light'
    applyTheme(initial)
    return initial
  })

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('frendli-theme', next)
      applyTheme(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
```

- [ ] **Step 7: Run ThemeContext test — expect PASS**

```bash
cd venue-portal && npm test src/contexts/__tests__/ThemeContext.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Step 8: Write the failing ThemeToggle test**

```typescript
// venue-portal/src/components/__tests__/ThemeToggle.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../ThemeToggle'

const mockToggle = vi.fn()

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: mockToggle }),
}))

describe('ThemeToggle', () => {
  it('renders switch to dark mode button in light mode', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })

  it('calls toggleTheme when clicked', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))
    expect(mockToggle).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 9: Run ThemeToggle test — expect FAIL**

```bash
cd venue-portal && npm test src/components/__tests__/ThemeToggle.test.tsx
```
Expected: FAIL — "Cannot find module '../ThemeToggle'"

- [ ] **Step 10: Create ThemeToggle.tsx**

```typescript
// venue-portal/src/components/ThemeToggle.tsx
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#8E8271] dark:text-[#9E8FC0] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] transition-colors"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
```

- [ ] **Step 11: Run ThemeToggle test — expect PASS**

```bash
cd venue-portal && npm test src/components/__tests__/ThemeToggle.test.tsx
```
Expected: PASS

- [ ] **Step 12: Update main.tsx to wrap with ThemeProvider**

```typescript
// venue-portal/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 13: Run all tests — expect all passing**

```bash
cd venue-portal && npm test
```
Expected: all existing tests still pass + 5 new tests pass.

- [ ] **Step 14: Build check**

```bash
cd venue-portal && npm run build
```
Expected: no errors.

- [ ] **Step 15: Commit**

```bash
git add venue-portal/index.html venue-portal/tailwind.config.js venue-portal/src/index.css venue-portal/src/main.tsx venue-portal/src/contexts/ThemeContext.tsx venue-portal/src/contexts/__tests__/ThemeContext.test.tsx venue-portal/src/components/ThemeToggle.tsx venue-portal/src/components/__tests__/ThemeToggle.test.tsx
git commit -m "feat(venue-portal): add Frendli design tokens, ThemeContext, ThemeToggle — light/dark mode foundation"
```

---

### Task 2: App.tsx — staff role fix (RedeemRoute)

**Files:**
- Modify: `venue-portal/src/App.tsx`

Note: `staffAuth.isAuthenticated()` is the correct method (not `hasSession()`). It returns `true` when an in-memory staff JWT is set.

- [ ] **Step 1: Replace App.tsx**

```typescript
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
```

- [ ] **Step 2: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add venue-portal/src/App.tsx
git commit -m "fix(venue-portal): RedeemRoute detects staff-only session — passes role=staff to Layout"
```

---

### Task 3: Navigation — Sidebar, BottomTabBar, Layout

**Files:**
- Modify: `venue-portal/src/components/Sidebar.tsx`
- Modify: `venue-portal/src/components/BottomTabBar.tsx`
- Modify: `venue-portal/src/components/Layout.tsx`

- [ ] **Step 1: Replace Sidebar.tsx**

```typescript
// venue-portal/src/components/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, ScanLine, User, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ThemeToggle } from './ThemeToggle'

interface Props { role?: 'owner' | 'staff' }

const ownerNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/promotions', label: 'Promotions', icon: Tag },
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
  { to: '/profile', label: 'Profile', icon: User },
]
const staffNav = [
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
]

export function Sidebar({ role = 'owner' }: Props) {
  const { venue } = useAuth()
  const nav = role === 'owner' ? ownerNav : staffNav

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#FFFBF7] dark:bg-[#1A1225] border-r border-[#EEEAE3] dark:border-[#3D2E55] h-full flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-[#EEEAE3] dark:border-[#3D2E55] flex items-center gap-3">
        {venue?.logo_url
          ? <img src={venue.logo_url} alt="Logo" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          : <div className="w-9 h-9 rounded-full bg-[#FF7F61] flex items-center justify-center text-sm font-bold text-white flex-shrink-0 font-['Bricolage_Grotesque']">
              {venue?.name?.[0]?.toUpperCase() ?? 'V'}
            </div>
        }
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-[#2D1E4B] dark:text-[#F0EBF8] truncate font-['Bricolage_Grotesque']">
            {venue?.name ?? 'Your Venue'}
          </p>
          <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] capitalize">
            {venue?.tier ?? 'listed'}
            {venue?.tier_payment_status === 'pending' && ' · Pending'}
          </p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-[#FFF1EE] dark:bg-[#2D1225] text-[#FF7F61] font-medium border-l-2 border-[#FF7F61] pl-[10px]'
                  : 'text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040]'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: theme toggle + logout */}
      <div className="p-2 border-t border-[#EEEAE3] dark:border-[#3D2E55] space-y-0.5">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
```

- [ ] **Step 2: Replace BottomTabBar.tsx**

```typescript
// venue-portal/src/components/BottomTabBar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, ScanLine, User } from 'lucide-react'

interface Props { role: 'owner' | 'staff' }

const ownerTabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/promotions', label: 'Promotions', icon: Tag },
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
  { to: '/profile', label: 'Profile', icon: User },
]
const staffTabs = [
  { to: '/redeem', label: 'Redeem', icon: ScanLine },
]

export function BottomTabBar({ role }: Props) {
  const tabs = role === 'owner' ? ownerTabs : staffTabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#FFFBF7] dark:bg-[#1A1225] border-t border-[#EEEAE3] dark:border-[#3D2E55] flex md:hidden z-40">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              isActive
                ? 'text-[#FF7F61]'
                : 'text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8]'
            }`
          }
        >
          <Icon size={20} />
          <span className="mt-0.5">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Replace Layout.tsx**

```typescript
// venue-portal/src/components/Layout.tsx
import { Sidebar } from './Sidebar'
import { BottomTabBar } from './BottomTabBar'

interface Props {
  children: React.ReactNode
  role?: 'owner' | 'staff'
}

export function Layout({ children, role = 'owner' }: Props) {
  return (
    <div className="flex h-screen w-full bg-[#FFFBF7] dark:bg-[#1A1225] text-[#2D1E4B] dark:text-[#F0EBF8] overflow-hidden">
      <Sidebar role={role} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomTabBar role={role} />
    </div>
  )
}
```

- [ ] **Step 4: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing (BottomTabBar tests still pass — they check aria-labels which are unchanged).

- [ ] **Step 5: Commit**

```bash
git add venue-portal/src/components/Sidebar.tsx venue-portal/src/components/BottomTabBar.tsx venue-portal/src/components/Layout.tsx
git commit -m "feat(venue-portal): restyle navigation — Frendli colours, coral active state, ThemeToggle in Sidebar"
```

---

### Task 4: Auth pages — Login (+ forgot password), Register (+ guard), StepIndicator

**Files:**
- Modify: `venue-portal/src/pages/Login.tsx`
- Create: `venue-portal/src/pages/__tests__/Login.test.tsx`
- Modify: `venue-portal/src/pages/auth/Register.tsx`
- Modify: `venue-portal/src/components/StepIndicator.tsx`

- [ ] **Step 1: Write the failing Login tests**

```typescript
// venue-portal/src/pages/__tests__/Login.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../Login'

const mockSignIn = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}))

const mockResetPassword = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetPassword,
    },
  },
}))

vi.mock('../../lib/staffAuth', () => ({
  staffAuth: { setSession: vi.fn() },
}))

describe('Login — forgot password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResetPassword.mockResolvedValue({ data: {}, error: null })
  })

  it('sends reset email when email is filled', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@bar.com' } })
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    await waitFor(() => expect(mockResetPassword).toHaveBeenCalledWith(
      'owner@bar.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/login') })
    ))
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows error when email is empty and forgot password clicked', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(await screen.findByText(/enter your email/i)).toBeInTheDocument()
    expect(mockResetPassword).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run Login test — expect FAIL**

```bash
cd venue-portal && npm test src/pages/__tests__/Login.test.tsx
```
Expected: FAIL — button not found / module errors.

- [ ] **Step 3: Replace Login.tsx**

```typescript
// venue-portal/src/pages/Login.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { staffAuth } from '../lib/staffAuth'

type Tab = 'owner' | 'staff'

const INPUT = "w-full mt-1 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"
const BTN_PRIMARY = "w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"

export default function Login() {
  const [tab, setTab] = useState<Tab>('owner')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [venueIdInput, setVenueIdInput] = useState('')
  const [pinInput, setPinInput] = useState('')
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError(null)
    setResetSent(false)
    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
    }
  }

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^\d{4}$/.test(pinInput)) { setError('PIN must be a 4-digit number.'); return }
    setLoading(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-staff-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_id: venueIdInput, pin: pinInput }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429 && data.seconds_remaining) {
          setError(`Too many attempts. Try again in ${Math.ceil(data.seconds_remaining / 60)} minutes.`)
        } else {
          setError(data.error ?? 'Invalid PIN.')
        }
        setLoading(false)
        return
      }
      staffAuth.setSession(data.token, venueIdInput)
      navigate('/redeem')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] dark:bg-[#1A1225] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-8 shadow-[0_4px_20px_rgba(45,30,75,0.08)]">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-center text-[#2D1E4B] dark:text-[#F0EBF8] mb-1">
          <span className="text-[#FF7F61]">Frendli</span> Venue Portal
        </h1>
        <p className="text-center text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-6">Manage your venue partnership</p>

        {/* Tab toggle */}
        <div className="flex rounded-xl bg-[#F5EEE6] dark:bg-[#1A1225] p-1 mb-6">
          {(['owner', 'staff'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); setResetSent(false) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t
                  ? 'bg-[#FF7F61] text-white shadow-sm'
                  : 'text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8]'
              }`}
            >
              {t === 'owner' ? 'Owner Login' : 'Staff Login'}
            </button>
          ))}
        </div>

        {tab === 'owner' ? (
          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Email</span>
              <input
                type="email" aria-label="Email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Password</span>
              <input
                type="password" aria-label="Password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
              />
            </label>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                aria-label="Forgot password"
                className="text-xs text-[#FF7F61] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {resetSent && (
              <p className="text-sm text-[#10B981]">Check your email — a reset link is on its way.</p>
            )}
            {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Venue ID</span>
              <input
                type="text" aria-label="Venue ID" required value={venueIdInput}
                onChange={(e) => setVenueIdInput(e.target.value)}
                placeholder="Provided by your manager"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">PIN</span>
              <input
                type="password" aria-label="PIN" required value={pinInput}
                maxLength={4} inputMode="numeric"
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`${INPUT} tracking-widest text-center text-2xl`}
              />
            </label>
            {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[#8E8271] dark:text-[#9E8FC0] mt-6">
          Don't have an account?{' '}
          <Link to="/register/1" className="text-[#FF7F61] hover:underline font-medium">
            Register your venue
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run Login test — expect PASS**

```bash
cd venue-portal && npm test src/pages/__tests__/Login.test.tsx
```
Expected: PASS (2 tests)

- [ ] **Step 5: Replace StepIndicator.tsx — coral steps, fix divider layout**

The current StepIndicator uses `position: absolute` for the divider inside a `<li>` with `flex-col` — the divider doesn't render correctly. The fix uses a `<div>` row wrapper with the connector between circles.

```typescript
// venue-portal/src/components/StepIndicator.tsx
interface Props {
  totalSteps: number
  currentStep: number
  labels: string[]
}

export function StepIndicator({ totalSteps, currentStep, labels }: Props) {
  return (
    <div className="flex items-start justify-center mb-8 gap-0">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isComplete = step < currentStep
        const isCurrent = step === currentStep
        const isLast = step === totalSteps

        return (
          <div key={step} className="flex items-center">
            {/* Circle + label */}
            <div className="flex flex-col items-center">
              <div
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
                data-complete={isComplete ? 'true' : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-colors ${
                  isComplete
                    ? 'bg-[#FF7F61] text-white'
                    : isCurrent
                      ? 'border-2 border-[#FF7F61] text-[#FF7F61] bg-white dark:bg-[#251A38]'
                      : 'border-2 border-[#EEEAE3] dark:border-[#3D2E55] text-[#8E8271] dark:text-[#9E8FC0] bg-white dark:bg-[#251A38]'
                }`}
              >
                {isComplete ? '✓' : step}
              </div>
              <span className={`text-xs hidden sm:block ${
                isCurrent
                  ? 'text-[#2D1E4B] dark:text-[#F0EBF8] font-medium'
                  : 'text-[#8E8271] dark:text-[#9E8FC0]'
              }`}>
                {labels[i]}
              </span>
            </div>
            {/* Connector line between circles */}
            {!isLast && (
              <div className={`h-0.5 w-10 mx-1 mb-5 flex-shrink-0 ${
                isComplete ? 'bg-[#FF7F61]' : 'bg-[#EEEAE3] dark:bg-[#3D2E55]'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Update Register.tsx — add completed-owner guard + Frendli background**

```typescript
// venue-portal/src/pages/auth/Register.tsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { StepIndicator } from '../../components/StepIndicator'
import Step1Account from './steps/Step1Account'
import Step2Details from './steps/Step2Details'
import Step3Location from './steps/Step3Location'
import Step4Tier from './steps/Step4Tier'

const STEP_LABELS = ['Account', 'Details', 'Location', 'Tier']

export default function Register() {
  const { step } = useParams<{ step: string }>()
  const navigate = useNavigate()
  const { session, venue } = useAuth()
  const currentStep = parseInt(step ?? '1', 10)

  // Guard: fully registered owners go straight to dashboard
  useEffect(() => {
    if (session && venue && venue.registration_step >= 4) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, venue, navigate])

  const handleStepSuccess = async () => {
    if (currentStep < 4) {
      navigate(`/register/${currentStep + 1}`)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] dark:bg-[#1A1225] text-[#2D1E4B] dark:text-[#F0EBF8] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-center mb-8">
          <span className="text-[#FF7F61]">Frendli</span> Venue Portal
        </h1>
        <StepIndicator totalSteps={4} currentStep={currentStep} labels={STEP_LABELS} />

        {currentStep === 1 && (
          <Step1Account onSuccess={handleStepSuccess} />
        )}
        {currentStep === 2 && session?.user && (
          <Step2Details venueId={session.user.id} onSuccess={handleStepSuccess} />
        )}
        {currentStep === 3 && session?.user && (
          <Step3Location venueId={session.user.id} onSuccess={handleStepSuccess} />
        )}
        {currentStep === 4 && session?.user && (
          <Step4Tier venueId={session.user.id} onSuccess={handleStepSuccess} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing.

- [ ] **Step 8: Commit**

```bash
git add venue-portal/src/pages/Login.tsx venue-portal/src/pages/__tests__/Login.test.tsx venue-portal/src/pages/auth/Register.tsx venue-portal/src/components/StepIndicator.tsx
git commit -m "feat(venue-portal): restyle Login/Register, add forgot password, register guard, coral StepIndicator"
```

---

### Task 5: Registration steps — Step1–Step4 restyling

**Files:**
- Modify: `venue-portal/src/pages/auth/steps/Step1Account.tsx`
- Modify: `venue-portal/src/pages/auth/steps/Step2Details.tsx`
- Modify: `venue-portal/src/pages/auth/steps/Step3Location.tsx`
- Modify: `venue-portal/src/pages/auth/steps/Step4Tier.tsx`

Apply the same style constants throughout. No logic changes.

- [ ] **Step 1: Replace Step1Account.tsx**

```typescript
// venue-portal/src/pages/auth/steps/Step1Account.tsx
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

const INPUT = "w-full mt-1 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"
const BTN = "w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"

interface Props { onSuccess: () => void }

export default function Step1Account({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Sign up failed')
      setLoading(false)
      return
    }
    const { error: insertError } = await supabase.from('venues').insert({
      id: data.user.id,
      name: '',
      category: 'other',
      registration_step: 1,
    })
    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }
    onSuccess()
  }

  return (
    <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] p-8 max-w-md mx-auto">
      <h2 className="text-xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Email</span>
          <input type="email" aria-label="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Password</span>
          <input type="password" aria-label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Confirm password</span>
          <input type="password" aria-label="Confirm password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} />
        </label>
        {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className={BTN}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Read Step2Details.tsx, then replace its styles**

Open `venue-portal/src/pages/auth/steps/Step2Details.tsx`. Apply these substitutions throughout (keep all logic identical):
- `bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500` → `bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]`
- `bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2 rounded` → `bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]`
- `text-slate-100` (headings) → `font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]`
- `text-slate-400` (labels) → `text-[#8E8271] dark:text-[#9E8FC0]`
- `text-red-400` → `text-red-500 dark:text-red-400`
- Wrap the return's outermost div with: `className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] p-8 max-w-2xl mx-auto"`

- [ ] **Step 3: Read Step3Location.tsx, then replace its styles**

Open `venue-portal/src/pages/auth/steps/Step3Location.tsx`. Apply the same substitutions as Step 2 above. Keep all MapPicker usage identical.

- [ ] **Step 4: Replace Step4Tier.tsx**

```typescript
// venue-portal/src/pages/auth/steps/Step4Tier.tsx
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { VenueTier } from '../../../lib/types'

interface TierCard { tier: VenueTier; label: string; price: string; features: string[] }

const TIERS: TierCard[] = [
  {
    tier: 'listed',
    label: 'Listed Partner',
    price: 'Free',
    features: ['Basic listing', 'Visible to users planning hangouts'],
  },
  {
    tier: 'perks',
    label: 'Perks Partner',
    price: '¥12,000/month',
    features: ['First 3 months free', 'Featured badge', 'Coupon program', 'Redemption dashboard'],
  },
  {
    tier: 'premier',
    label: 'Premier Partner',
    price: '¥36,000/month',
    features: ['All Perks features', 'Exclusive category', 'Top of feed', 'Dedicated support'],
  },
]

interface Props { venueId: string; onSuccess: () => void }

export default function Step4Tier({ venueId, onSuccess }: Props) {
  const [selected, setSelected] = useState<VenueTier | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    const isPaid = selected !== 'listed'
    const { error: updateError } = await supabase
      .from('venues')
      .update({ tier: selected, tier_payment_status: isPaid ? 'pending' : 'none', registration_step: 4 })
      .eq('id', venueId)
    if (updateError) { setError(updateError.message); setLoading(false); return }
    onSuccess()
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h2 className="text-xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">Choose your tier</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((t) => (
          <button
            key={t.tier}
            type="button"
            onClick={() => setSelected(t.tier)}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selected === t.tier
                ? 'border-[#FF7F61] bg-[#FFF1EE] dark:bg-[#2D1225] shadow-[0_4px_16px_rgba(255,127,97,0.2)]'
                : 'border-[#EEEAE3] dark:border-[#3D2E55] bg-white dark:bg-[#251A38] hover:border-[#FF7F61]/50'
            }`}
          >
            <p className="font-['Bricolage_Grotesque'] font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">{t.label}</p>
            <p className="text-[#FF7F61] text-sm font-medium mt-1">{t.price}</p>
            <ul className="mt-2 space-y-1">
              {t.features.map((f) => (
                <li key={f} className="text-xs text-[#8E8271] dark:text-[#9E8FC0]">• {f}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
      {selected && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
        >
          {loading ? 'Saving…' : selected === 'listed' ? 'Complete Registration' : 'Continue to Payment'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add venue-portal/src/pages/auth/steps/
git commit -m "feat(venue-portal): restyle registration steps 1–4 with Frendli design tokens"
```

---

### Task 6: Dashboard

**Files:**
- Modify: `venue-portal/src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace Dashboard.tsx**

```typescript
// venue-portal/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

interface DayCount { date: string; count: number }

export default function Dashboard() {
  const { session, venue } = useAuth()
  const venueId = session?.user?.id
  const [monthlyCount, setMonthlyCount] = useState<number>(0)
  const [allTimeCount, setAllTimeCount] = useState<number>(0)
  const [activePromos, setActivePromos] = useState<number>(0)
  const [chartData, setChartData] = useState<DayCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!venueId) return
    const load = async () => {
      const now = new Date()

      const { data: monthly } = await supabase
        .from('venue_redemptions').select('redeemed_at').eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', startOfMonth(now).toISOString())
        .lte('redeemed_at', endOfMonth(now).toISOString())
      setMonthlyCount(monthly?.length ?? 0)

      const { data: allTime } = await supabase
        .from('venue_redemptions').select('redeemed_at').eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', new Date(0).toISOString())
        .lte('redeemed_at', now.toISOString())
      setAllTimeCount(allTime?.length ?? 0)

      const { data: promos } = await supabase
        .from('venue_promotions').select('id').eq('venue_id', venueId)
        .eq('is_active', true).gt('valid_until', now.toISOString())
      setActivePromos(promos?.length ?? 0)

      const { data: redemptions } = await supabase
        .from('venue_redemptions').select('redeemed_at').eq('venue_id', venueId)
        .not('redeemed_at', 'is', null)
        .gte('redeemed_at', subDays(now, 29).toISOString())
        .lte('redeemed_at', now.toISOString())

      const countsByDay: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        countsByDay[format(subDays(now, i), 'MM/dd')] = 0
      }
      for (const r of redemptions ?? []) {
        const day = format(new Date(r.redeemed_at!), 'MM/dd')
        if (day in countsByDay) countsByDay[day]++
      }
      setChartData(Object.entries(countsByDay).map(([date, count]) => ({ date, count })))
      setLoading(false)
    }
    load()
  }, [venueId])

  const isPendingPayment = venue?.tier !== 'listed' && venue?.tier_payment_status !== 'active'
  const showUpgradeBanner = venue?.tier === 'listed' || isPendingPayment

  const TIER_LABELS: Record<string, string> = {
    listed: 'Listed', perks: 'Perks', premier: 'Premier',
  }

  const cards = [
    { label: 'Redemptions this month', value: loading ? '—' : monthlyCount },
    { label: 'All-time redemptions',   value: loading ? '—' : allTimeCount },
    { label: 'Active promotions',      value: loading ? '—' : activePromos },
    { label: 'Current tier',           value: loading ? '—' : TIER_LABELS[venue?.tier ?? 'listed'] },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />

      <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">
        Dashboard
      </h1>

      {showUpgradeBanner && (
        <div className="mb-6 p-4 bg-[#FFF1EE] dark:bg-[#2D1225] border border-[#FF7F61]/30 rounded-2xl flex items-center justify-between">
          <p className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8]">
            {isPendingPayment
              ? 'Your payment is pending. Full tier features will unlock once confirmed.'
              : 'Unlock promotions and redemption analytics with Perks or Premier.'}
          </p>
          <button className="ml-4 text-xs bg-[#FF7F61] hover:bg-[#E6684B] text-white font-semibold px-3 py-1 rounded-lg whitespace-nowrap transition-colors">
            Upgrade
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 shadow-[0_4px_20px_rgba(45,30,75,0.05)]">
            <div className="w-2 h-2 rounded-full bg-[#FF7F61] mb-2" />
            <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mb-1">{c.label}</p>
            <p className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-6 shadow-[0_4px_20px_rgba(45,30,75,0.05)]">
        <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-4 font-medium">Redemptions — last 30 days</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8E8271' }} interval={6} />
            <YAxis tick={{ fontSize: 10, fill: '#8E8271' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#FFFBF7',
                border: '1px solid #EEEAE3',
                color: '#2D1E4B',
                borderRadius: '12px',
              }}
            />
            <Bar dataKey="count" fill="#FF7F61" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing (Dashboard tests check text labels, not CSS).

- [ ] **Step 3: Commit**

```bash
git add venue-portal/src/pages/Dashboard.tsx
git commit -m "feat(venue-portal): restyle Dashboard — Frendli cards, coral chart and upgrade banner"
```

---

### Task 7: Promotions, TierGate, PromotionForm

**Files:**
- Modify: `venue-portal/src/pages/Promotions.tsx`
- Modify: `venue-portal/src/components/TierGate.tsx`
- Modify: `venue-portal/src/components/PromotionForm.tsx`

- [ ] **Step 1: Replace TierGate.tsx**

```typescript
// venue-portal/src/components/TierGate.tsx
import type { Venue } from '../lib/types'

interface Props { venue: Venue; children: React.ReactNode }

export function TierGate({ venue, children }: Props) {
  const isListed = venue.tier === 'listed'
  const isPending = venue.tier_payment_status !== 'active'

  if (isListed) {
    return (
      <div className="relative">
        <div className="opacity-20 pointer-events-none select-none" aria-hidden>{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFBF7]/90 dark:bg-[#1A1225]/90 rounded-2xl">
          <div className="text-center p-6 max-w-sm">
            <p className="text-3xl mb-3">🔒</p>
            <h3 className="text-lg font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-2">
              Perks or Premier Required
            </h3>
            <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-4">
              The coupon program is available on Perks and Premier tiers.
            </p>
            <button className="bg-[#FF7F61] hover:bg-[#E6684B] text-white font-semibold px-6 py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="relative">
        <div className="opacity-20 pointer-events-none select-none" aria-hidden>{children}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFBF7]/90 dark:bg-[#1A1225]/90 rounded-2xl">
          <div className="text-center p-6 max-w-sm">
            <p className="text-3xl mb-3">⏳</p>
            <h3 className="text-lg font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-2">
              Payment Pending
            </h3>
            <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">
              We'll reach out to confirm your subscription. Promotions will unlock once payment is active.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Replace PromotionForm.tsx**

```typescript
// venue-portal/src/components/PromotionForm.tsx
import { useState } from 'react'
import type { VenuePromotion } from '../lib/types'

type FormData = Pick<VenuePromotion, 'title' | 'discount' | 'valid_from' | 'valid_until'> & {
  description?: string | null
  is_active?: boolean
}

interface Props {
  initial?: FormData
  onSubmit: (data: FormData) => Promise<void>
  onClose: () => void
}

const INPUT = "w-full mt-1 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"

function toDateInput(iso: string) { return iso ? iso.slice(0, 10) : '' }
function fromDateInput(date: string) { return date ? new Date(date).toISOString() : '' }

export function PromotionForm({ initial, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [discount, setDiscount] = useState(initial?.discount ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [validFrom, setValidFrom] = useState(toDateInput(initial?.valid_from ?? ''))
  const [validUntil, setValidUntil] = useState(toDateInput(initial?.valid_until ?? ''))
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('Title is required.'); return }
    if (!discount.trim()) { setError('Discount is required.'); return }
    if (!validFrom || !validUntil) { setError('Valid from and until dates are required.'); return }
    if (new Date(validUntil) <= new Date(validFrom)) { setError('Valid until must be after valid from.'); return }
    setLoading(true)
    try {
      await onSubmit({
        title, discount, description: description || null,
        valid_from: fromDateInput(validFrom), valid_until: fromDateInput(validUntil), is_active: isActive,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-[#FFFBF7] dark:bg-[#1A1225] border-l border-[#EEEAE3] dark:border-[#3D2E55] h-full overflow-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">
            {initial ? 'Edit Promotion' : 'New Promotion'}
          </h2>
          <button onClick={onClose} className="text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Title</span>
            <input aria-label="Title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Discount</span>
            <input aria-label="Discount" type="text" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 10% off, Buy 1 Get 1" className={INPUT} />
          </label>
          <label className="block">
            <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Description (optional)</span>
            <textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={2} className={INPUT + ' resize-none'} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Valid from</span>
              <input aria-label="Valid from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Valid until</span>
              <input aria-label="Valid until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={INPUT} />
            </label>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded accent-[#FF7F61]" />
            <span className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8]">Active</span>
          </label>
          {error && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-[#EEEAE3] dark:border-[#3D2E55] text-[#2D1E4B] dark:text-[#C4B5E8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] font-semibold py-2 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace Promotions.tsx**

```typescript
// venue-portal/src/pages/Promotions.tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePromotions } from '../hooks/usePromotions'
import { TierGate } from '../components/TierGate'
import { PromotionForm } from '../components/PromotionForm'
import type { VenuePromotion } from '../lib/types'

type EditTarget = VenuePromotion | 'new' | null

export default function Promotions() {
  const { venue } = useAuth()
  const { promotions, loading, createPromotion, updatePromotion, togglePromotion } = usePromotions()
  const [formTarget, setFormTarget] = useState<EditTarget>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!venue) return null

  const handleFormSubmit = async (data: Parameters<typeof createPromotion>[0]) => {
    setActionError(null)
    if (formTarget === 'new') {
      await createPromotion(data)
    } else if (formTarget) {
      await updatePromotion((formTarget as VenuePromotion).id, data)
    }
    setFormTarget(null)
  }

  const handleToggle = async (id: string, current: boolean) => {
    setActionError(null)
    try { await togglePromotion(id, !current) }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Error') }
  }

  const activePromos = promotions.filter(p => p.is_active && new Date(p.valid_until) > new Date())
  const pastPromos = promotions.filter(p => !p.is_active || new Date(p.valid_until) <= new Date())

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">Promotions</h1>
        <button
          onClick={() => setFormTarget('new')}
          className="flex items-center gap-2 bg-[#FF7F61] hover:bg-[#E6684B] text-white font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
        >
          <Plus size={16} />
          New Promotion
        </button>
      </div>

      <TierGate venue={venue}>
        {loading ? (
          <p className="text-[#8E8271] dark:text-[#9E8FC0]">Loading…</p>
        ) : (
          <div className="space-y-6">
            {actionError && <p className="text-red-500 dark:text-red-400 text-sm">{actionError}</p>}

            <section>
              <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">Active</h2>
              {activePromos.length === 0
                ? <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">No active promotions. Create one above.</p>
                : <div className="space-y-3">{activePromos.map(p => <PromotionCard key={p.id} promotion={p} onEdit={() => setFormTarget(p)} onToggle={() => handleToggle(p.id, p.is_active)} />)}</div>
              }
            </section>

            {pastPromos.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">Past / Inactive</h2>
                <div className="space-y-3">{pastPromos.map(p => <PromotionCard key={p.id} promotion={p} onEdit={() => setFormTarget(p)} onToggle={() => handleToggle(p.id, p.is_active)} />)}</div>
              </section>
            )}
          </div>
        )}
      </TierGate>

      {formTarget && (
        <PromotionForm
          initial={formTarget === 'new' ? undefined : formTarget as VenuePromotion}
          onSubmit={handleFormSubmit}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  )
}

function PromotionCard({ promotion: p, onEdit, onToggle }: { promotion: VenuePromotion; onEdit: () => void; onToggle: () => void }) {
  const expired = new Date(p.valid_until) <= new Date()
  return (
    <div className={`bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 flex items-start justify-between gap-4 shadow-[0_4px_20px_rgba(45,30,75,0.05)] ${!p.is_active || expired ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#2D1E4B] dark:text-[#F0EBF8]">{p.title}</p>
        <p className="text-[#FF7F61] text-sm">{p.discount}</p>
        {p.description && <p className="text-[#8E8271] dark:text-[#9E8FC0] text-xs mt-1">{p.description}</p>}
        <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mt-1">
          {format(new Date(p.valid_from), 'MMM d, yyyy')} – {format(new Date(p.valid_until), 'MMM d, yyyy')}
          {expired && <span className="ml-2 text-red-500">Expired</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onEdit} className="text-xs text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] px-2 py-1 rounded-lg border border-[#EEEAE3] dark:border-[#3D2E55] hover:border-[#FF7F61]/50 transition-colors">
          Edit
        </button>
        <button onClick={onToggle}
          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${p.is_active ? 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10' : 'text-[#8E8271] dark:text-[#9E8FC0] border-[#EEEAE3] dark:border-[#3D2E55]'}`}>
          {p.is_active ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add venue-portal/src/pages/Promotions.tsx venue-portal/src/components/TierGate.tsx venue-portal/src/components/PromotionForm.tsx
git commit -m "feat(venue-portal): restyle Promotions, TierGate, PromotionForm with Frendli design tokens"
```

---

### Task 8: Profile page

**Files:**
- Modify: `venue-portal/src/pages/Profile.tsx`

- [ ] **Step 1: Replace Profile.tsx**

Keep all logic and form handlers identical. Only the JSX structure and classNames change.

```typescript
// venue-portal/src/pages/Profile.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useVenue } from '../hooks/useVenue'
import { useAuth } from '../contexts/AuthContext'
import { MapPicker } from '../components/MapPicker'
import { HoursEditor, DEFAULT_HOURS } from '../components/HoursEditor'
import { ThemeToggle } from '../components/ThemeToggle'
import type { MapLocation } from '../components/MapPicker'
import type { Venue, VenueCategory, VenueHours } from '../lib/types'

const INPUT = "w-full mt-1 bg-white dark:bg-[#1A1225] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"
const CARD = "bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] p-6"
const SECTION_TITLE = "text-base font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-4"

const CATEGORIES = [
  { value: 'cafe', label: 'Café' }, { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurant' }, { value: 'bowling_alley', label: 'Bowling Alley' },
  { value: 'karaoke', label: 'Karaoke' }, { value: 'escape_room', label: 'Escape Room' },
  { value: 'activity_venue', label: 'Activity Venue' }, { value: 'other', label: 'Other' },
]

export default function Profile() {
  const { session } = useAuth()
  const { venue, loading, updateVenue } = useVenue()
  const venueId = session?.user?.id ?? ''

  const [name, setName] = useState('')
  const [category, setCategory] = useState<VenueCategory>('other')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState<VenueHours>(DEFAULT_HOURS)
  const [location, setLocation] = useState<MapLocation | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!venue) return
    setName(venue.name)
    setCategory(venue.category)
    setPhone(venue.phone ?? '')
    setEmail(venue.email ?? '')
    setWebsite(venue.website ?? '')
    setDescription(venue.description ?? '')
    setHours(venue.hours ?? DEFAULT_HOURS)
    if (venue.lat != null && venue.lng != null) {
      setLocation({ lat: venue.lat, lng: venue.lng, address: venue.address ?? '' })
    } else if (venue.address) {
      setLocation({ lat: null, lng: null, address: venue.address })
    }
  }, [venue])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)
    if (!name.trim()) { setSaveError('Venue name is required.'); return }
    setSaving(true)
    try {
      await updateVenue({
        name, category, phone, email, website, description, hours,
        lat: location?.lat ?? null, lng: location?.lng ?? null, address: location?.address ?? null,
      })
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    const path = `${venueId}/${type}`
    const { error } = await supabase.storage.from('venue-assets').upload(path, file, { upsert: true })
    if (error) { setSaveError(error.message); return }
    const { data: { publicUrl } } = supabase.storage.from('venue-assets').getPublicUrl(path)
    await updateVenue(type === 'logo' ? { logo_url: publicUrl } : { cover_url: publicUrl })
  }

  if (loading) return <div className="p-6 text-[#8E8271] dark:text-[#9E8FC0]">Loading…</div>

  const showLocationPrompt = venue?.lat == null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />
      <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-6">Venue Profile</h1>

      <form onSubmit={handleSave} className="space-y-4">

        {/* Branding */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Branding</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Logo</span>
              {venue?.logo_url && <img src={venue.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover mb-2 mt-1" />}
              <input type="file" accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                className="mt-1 text-sm text-[#8E8271] dark:text-[#9E8FC0] block" />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Cover photo</span>
              {venue?.cover_url && <img src={venue.cover_url} alt="Cover" className="w-full h-20 rounded-xl object-cover mb-2 mt-1" />}
              <input type="file" accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                className="mt-1 text-sm text-[#8E8271] dark:text-[#9E8FC0] block" />
            </label>
          </div>
        </div>

        {/* Details */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Details</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Venue name *</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as VenueCategory)} className={INPUT}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Phone</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} />
              </label>
              <label className="block">
                <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Website</span>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={INPUT} />
            </label>
            <label className="block">
              <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Description (max 300 chars)</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                rows={3} className={INPUT + ' resize-none'} />
              <span className="text-xs text-[#8E8271] dark:text-[#9E8FC0]">{description.length}/300</span>
            </label>
          </div>
        </div>

        {/* Location */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Location</h2>
          {showLocationPrompt && (
            <p className="text-[#FF7F61] text-sm mb-3">
              📍 Pin your location to enable SafeArrival precision and hangout suggestions.
            </p>
          )}
          <MapPicker value={location} onChange={setLocation} />
        </div>

        {/* Hours */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>Operating hours</h2>
          <HoursEditor value={hours} onChange={setHours} />
        </div>

        {saveError && <p role="alert" className="text-red-500 dark:text-red-400 text-sm">{saveError}</p>}
        {saveSuccess && <p className="text-[#10B981] text-sm">Changes saved!</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* Staff Access */}
      {venue && <StaffPinSection venueId={venueId} venue={venue} />}

      {/* Tier */}
      <div className={`mt-4 ${CARD}`}>
        <h2 className={SECTION_TITLE}>Tier</h2>
        <p className="text-sm text-[#2D1E4B] dark:text-[#F0EBF8]">
          Current tier:{' '}
          <span className="inline-block bg-[#FFF1EE] dark:bg-[#2D1225] text-[#FF7F61] font-semibold px-2 py-0.5 rounded-lg text-xs capitalize">
            {venue?.tier}
          </span>
          {venue?.tier_payment_status === 'pending' && (
            <span className="ml-2 text-amber-500 dark:text-amber-400 text-xs">(Payment Pending)</span>
          )}
        </p>
        <button className="mt-3 text-sm text-[#FF7F61] hover:underline font-medium">Upgrade / Contact Us</button>
      </div>

      {/* Appearance */}
      <div className={`mt-4 ${CARD}`}>
        <h2 className={SECTION_TITLE}>Appearance</h2>
        <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-3">Choose between light and dark mode.</p>
        <div className="max-w-xs">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

export function StaffPinSection({ venueId, venue }: { venueId: string; venue: Venue }) {
  const { session } = useAuth()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccess, setPinSuccess] = useState(false)
  const [savingPin, setSavingPin] = useState(false)

  const isLocked = venue.staff_pin_locked_until && new Date(venue.staff_pin_locked_until) > new Date()

  const INPUT_PIN = "w-full mt-1 bg-white dark:bg-[#1A1225] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-xl px-3 py-2 text-[#2D1E4B] dark:text-[#F0EBF8] text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]"

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError(null)
    setPinSuccess(false)
    if (!/^\d{4}$/.test(pin)) { setPinError('PIN must be exactly 4 digits.'); return }
    if (pin !== confirmPin) { setPinError('PINs do not match.'); return }
    setSavingPin(true)
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const res = await fetch(`${supabaseUrl}/functions/v1/update-staff-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ new_pin: pin }),
      })
      const data = await res.json()
      if (!res.ok) { setPinError(data.error ?? 'Failed to update PIN.'); return }
      setPin(''); setConfirmPin(''); setPinSuccess(true)
    } catch {
      setPinError('Network error.')
    } finally {
      setSavingPin(false)
    }
  }

  return (
    <div className="mt-4 bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl shadow-[0_4px_20px_rgba(45,30,75,0.05)] p-6">
      <h2 className="text-base font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] mb-1">🔒 Staff Access</h2>
      <p className="text-sm text-[#8E8271] dark:text-[#9E8FC0] mb-4">
        Set a 4-digit PIN for staff to access the Redemption page. The PIN is never stored in plain text.
      </p>
      {isLocked && (
        <p className="text-amber-500 dark:text-amber-400 text-sm mb-3">
          PIN entry is locked due to too many failed attempts.
        </p>
      )}
      <form onSubmit={handleSetPin} className="space-y-3 max-w-xs">
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">New PIN</span>
          <input type="password" value={pin} maxLength={4} inputMode="numeric"
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={INPUT_PIN} />
        </label>
        <label className="block">
          <span className="text-sm text-[#8E8271] dark:text-[#9E8FC0]">Confirm PIN</span>
          <input type="password" value={confirmPin} maxLength={4} inputMode="numeric"
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className={INPUT_PIN} />
        </label>
        {pinError && <p className="text-red-500 dark:text-red-400 text-sm">{pinError}</p>}
        {pinSuccess && <p className="text-[#10B981] text-sm">PIN updated successfully!</p>}
        <button type="submit" disabled={savingPin}
          className="bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
          {savingPin ? 'Saving…' : venue.staff_pin_hash ? 'Update PIN' : 'Set PIN'}
        </button>
      </form>
      {venue.staff_pin_hash && (
        <p className="mt-3 text-xs text-[#8E8271] dark:text-[#9E8FC0]">
          Share your Venue ID (<span className="font-mono text-[#2D1E4B] dark:text-[#F0EBF8]">{venueId}</span>) and the PIN with your staff.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add venue-portal/src/pages/Profile.tsx
git commit -m "feat(venue-portal): restyle Profile — section cards, Appearance toggle, coral StaffPin section"
```

---

### Task 9: Redemption page

**Files:**
- Modify: `venue-portal/src/pages/Redemption.tsx`

- [ ] **Step 1: Replace Redemption.tsx**

Remove the redundant `min-h-screen bg-[#0a0f1a]` — `Layout` owns the background. All coral buttons for primary actions; emerald kept for success states (universal colour).

```typescript
// venue-portal/src/pages/Redemption.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { staffFetch, StaffSessionExpiredError } from '../lib/staffAuth'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const VALID_CHARS = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')

type RedeemStatus =
  | { status: 'valid'; promotion_title: string; discount: string; valid_until: string }
  | { status: 'already_redeemed'; promotion_title: string; discount: string; redeemed_at: string }
  | { status: 'invalid' | 'expired'; promotion_title?: string }
  | { status: 'confirmed'; promotion_title: string; discount: string }

type UiState = 'input' | 'check_result' | 'confirmed'

export default function Redemption() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [uiState, setUiState] = useState<UiState>('input')
  const [checkResult, setCheckResult] = useState<RedeemStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCodeChange = (raw: string) => {
    const cleaned = raw.toUpperCase().split('').filter(c => VALID_CHARS.has(c)).slice(0, 6).join('')
    setCode(cleaned)
  }

  const handleCheckCode = async () => {
    if (code.length !== 6) return
    setLoading(true)
    try {
      const data = await staffFetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, { code, action: 'check' }) as RedeemStatus
      setCheckResult(data)
      setUiState('check_result')
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        navigate('/login', { state: { expiredMessage: 'Your session has expired. Please enter the PIN to continue.' } })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const data = await staffFetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, { code, action: 'confirm' }) as RedeemStatus
      setCheckResult(data)
      setUiState('confirmed')
    } catch (err) {
      if (err instanceof StaffSessionExpiredError) {
        navigate('/login', { state: { expiredMessage: 'Your session has expired. Please enter the PIN to continue.' } })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => { setCode(''); setCheckResult(null); setUiState('input') }

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <div className="w-full max-w-sm">
        <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-8 rounded-full" />
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8] text-center mb-8">
          Redeem Coupon
        </h1>

        {/* Code Input */}
        {uiState === 'input' && (
          <div className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full bg-white dark:bg-[#251A38] border-2 border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl px-4 py-4 text-[#2D1E4B] dark:text-[#F0EBF8] text-3xl text-center tracking-widest font-mono uppercase focus:outline-none focus:border-[#FF7F61]"
            />
            <button
              onClick={handleCheckCode}
              disabled={code.length !== 6 || loading}
              className="w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-bold py-4 text-lg rounded-2xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
            >
              {loading ? 'Checking…' : 'Check Code'}
            </button>
          </div>
        )}

        {/* Check result */}
        {uiState === 'check_result' && checkResult && (
          <div className="space-y-4">
            {checkResult.status === 'valid' && (
              <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-6 text-center">
                <p className="text-[#10B981] text-sm font-semibold uppercase tracking-wider mb-1">Valid Code</p>
                <p className="text-[#2D1E4B] dark:text-[#F0EBF8] text-xl font-['Bricolage_Grotesque'] font-bold">{checkResult.promotion_title}</p>
                <p className="text-[#FF7F61] text-lg mt-1">{checkResult.discount}</p>
                <p className="text-[#8E8271] dark:text-[#9E8FC0] text-xs mt-2">
                  Expires {format(new Date(checkResult.valid_until), 'MMM d, yyyy')}
                </p>
              </div>
            )}
            {checkResult.status === 'already_redeemed' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
                <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-1">Already Redeemed</p>
                <p className="text-[#2D1E4B] dark:text-[#F0EBF8] text-xl font-['Bricolage_Grotesque'] font-bold">{checkResult.promotion_title}</p>
                <p className="text-red-400 text-sm mt-2">
                  Redeemed at {format(new Date(checkResult.redeemed_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            )}
            {(checkResult.status === 'invalid' || checkResult.status === 'expired') && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
                <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-1">
                  {checkResult.status === 'expired' ? 'Expired Code' : 'Invalid Code'}
                </p>
                <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm mt-2">
                  {checkResult.status === 'expired' ? 'This promotion has expired.' : 'This code is not valid for your venue.'}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={handleReset}
                className="flex-1 border border-[#EEEAE3] dark:border-[#3D2E55] text-[#2D1E4B] dark:text-[#C4B5E8] hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040] font-semibold py-3 rounded-2xl transition-colors">
                Try Another
              </button>
              {checkResult.status === 'valid' && (
                <button onClick={handleConfirm} disabled={loading}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3 rounded-2xl transition-colors">
                  {loading ? 'Confirming…' : 'Confirm Redemption'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmed */}
        {uiState === 'confirmed' && checkResult?.status === 'confirmed' && (
          <div className="space-y-4">
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-[#10B981] text-sm font-semibold uppercase tracking-wider mb-1">Redeemed!</p>
              <p className="text-[#2D1E4B] dark:text-[#F0EBF8] text-xl font-['Bricolage_Grotesque'] font-bold">{checkResult.promotion_title}</p>
              <p className="text-[#FF7F61] text-lg mt-1">{checkResult.discount}</p>
            </div>
            <button onClick={handleReset}
              className="w-full bg-[#FF7F61] hover:bg-[#E6684B] text-white font-bold py-4 text-lg rounded-2xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]">
              Next Customer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run all tests — expect PASS**

```bash
cd venue-portal && npm test
```
Expected: all passing.

- [ ] **Step 3: Full build check**

```bash
cd venue-portal && npm run build
```
Expected: no errors, no warnings about missing modules.

- [ ] **Step 4: Commit**

```bash
git add venue-portal/src/pages/Redemption.tsx
git commit -m "feat(venue-portal): restyle Redemption — remove redundant bg, coral primary actions, Frendli design tokens"
```

---

## Plan Complete

All tasks done. The venue portal now uses the full Frendli design system: coral primary, deep violet secondary, Bricolage Grotesque + Lexend typography, warm cream/violet surfaces, and light/dark mode with localStorage persistence. Three functional gaps are also resolved: staff Layout role, forgot password, and registration step guard.
