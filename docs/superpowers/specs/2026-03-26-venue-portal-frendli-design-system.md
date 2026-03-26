# Venue Portal — Frendli Design System Adoption + Feature Fixes

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Visual redesign + three functional bug fixes

---

## Goal

Bring the venue portal in line with the Frendli brand so it feels like the same product as the mobile app. Adopt the Frendli colour palette, typography, card patterns, and shadow system. Add light/dark mode with light as the default and a user-controlled toggle. Fix three known functional gaps identified during the audit.

---

## Design Tokens

### Colour Palette

All colours sourced from `frendli-app/constants/tokens.ts`.

| Token | Light value | Dark value |
|---|---|---|
| `primary` | `#FF7F61` (coral) | `#FF7F61` |
| `primary-dark` | `#E6684B` | `#E6684B` |
| `secondary` | `#2D1E4B` (deep violet) | `#C4B5E8` |
| `accent` | `#00E5D4` (mint) | `#00E5D4` |
| `bg` | `#FFFBF7` (cream) | `#1A1225` (violet-black) |
| `surface` | `#FFFFFF` | `#251A38` |
| `surface-2` | `#F5EEE6` (sand) | `#2D2040` |
| `text-primary` | `#2D1E4B` | `#F0EBF8` |
| `text-secondary` | `#8E8271` | `#9E8FC0` |
| `border` | `#EEEAE3` | `#3D2E55` |
| `success` | `#10B981` | `#10B981` |
| `warning` | `#FBBF24` | `#FBBF24` |
| `error` | `#EF4444` | `#EF4444` |

The dark palette uses violet-blacks (not blue-navy) to stay in the Frendli family.

### Typography

- **Headings:** Bricolage Grotesque (ExtraBold 800, Bold 700, SemiBold 600)
- **Body:** Lexend (Regular 400, Medium 500, SemiBold 600)
- Loaded via Google Fonts in `index.html`
- Tailwind `fontFamily` extended: `{ 'bricolage': ['Bricolage Grotesque', 'sans-serif'], 'lexend': ['Lexend', 'sans-serif'] }`
- `body` default font: Lexend

### Shadows

Warm violet-tinted shadows matching the mobile app:

| Name | Value |
|---|---|
| `sm` | `0 2px 4px rgba(45,30,75,0.04)` |
| `md` | `0 8px 12px rgba(45,30,75,0.08)` |
| `card` | `0 4px 20px rgba(45,30,75,0.05)` |
| `coral` | `0 4px 16px rgba(255,127,97,0.35)` (hover glow on CTA buttons) |

---

## Theme Architecture

### Mechanism

- `tailwind.config.js`: `darkMode: 'class'`
- A `dark` class on `<html>` activates all `dark:` variants
- Default: light mode

### ThemeContext

```
venue-portal/src/contexts/ThemeContext.tsx
```

- Exports `ThemeProvider` and `useTheme()`
- On mount: reads `localStorage.getItem('frendli-theme')`, defaults to `'light'`
- Synchronously applies/removes `dark` class on `document.documentElement` before first paint (avoids flash)
- `toggleTheme()` flips between `'light'` and `'dark'`, persists to localStorage

### ThemeToggle component

```
venue-portal/src/components/ThemeToggle.tsx
```

- Renders a sun icon (light mode) or moon icon (dark mode) using lucide-react
- Used in two places: bottom of Sidebar (above Logout), and "Appearance" card in Profile page

---

## Component Patterns

### Cards

```
bg-white dark:bg-[#251A38]
border border-[#EEEAE3] dark:border-[#3D2E55]
shadow-[0_4px_20px_rgba(45,30,75,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
rounded-2xl p-6
```

### Primary CTA buttons (coral)

```
bg-[#FF7F61] hover:bg-[#E6684B] text-white font-semibold rounded-xl px-4 py-2
transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]
```

### Secondary / ghost buttons

```
border border-[#EEEAE3] dark:border-[#3D2E55]
text-[#2D1E4B] dark:text-[#C4B5E8]
hover:bg-[#F5EEE6] dark:hover:bg-[#2D2040]
rounded-xl px-4 py-2 font-semibold transition-colors
```

### Form inputs

```
bg-white dark:bg-[#251A38]
border border-[#EEEAE3] dark:border-[#3D2E55]
text-[#2D1E4B] dark:text-[#F0EBF8]
rounded-xl px-3 py-2 w-full
focus:outline-none focus:ring-2 focus:ring-[#FF7F61]/30 focus:border-[#FF7F61]
```

### Section headings

```
font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]
```

### Page accent bar

Each authenticated page has a 2px coral-to-violet gradient bar at the very top of the content area:
```
h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B]
```

---

## Navigation

### Sidebar (desktop, md+)

- Light: `bg-[#FFFBF7]` background, `border-r border-[#EEEAE3]`
- Dark: `bg-[#1A1225]` background, `border-r border-[#3D2E55]`
- Active nav item: coral left border + coral text (`text-[#FF7F61]`, `border-l-2 border-[#FF7F61]`, `bg-[#FFF1EE] dark:bg-[#2D1225]`)
- Inactive: `text-[#8E8271] dark:text-[#9E8FC0]`, hover `bg-[#F5EEE6] dark:bg-[#2D2040]`
- Venue name: Bricolage Grotesque semibold, deep violet / near-white
- ThemeToggle rendered above Logout button

### BottomTabBar (mobile, below md)

- Light: `bg-[#FFFBF7]` + `border-t border-[#EEEAE3]`
- Dark: `bg-[#1A1225]` + `border-t border-[#3D2E55]`
- Active tab: coral (`text-[#FF7F61]`)

---

## Page-by-Page Changes

### Login

- Page background: `bg-[#FFFBF7] dark:bg-[#1A1225]`
- Card: new card pattern, centered
- "Frendli" in coral, subtitle in violet
- Tab toggle: coral active state
- Add "Forgot password?" link — calls `supabase.auth.resetPasswordForEmail(email)`, shows confirmation message
- PIN input for staff: keep large tracking-widest style, update colours

### Register wizard

- Page background matches Login
- StepIndicator: completed steps = coral filled circle; current = coral ring; future = sand/grey
- All step forms use new input/button patterns
- Guard: if `venue?.registration_step === 4` and session exists, redirect to `/dashboard`

### Dashboard

- Stat cards: new card pattern, Bricolage Grotesque for numbers, coral icon accent dot
- Upgrade banner: coral-tinted (`bg-[#FFF1EE] dark:bg-[#2D1225]`, `border-[#FF7F61]/30`)
- Chart bar fill: `#FF7F61` (coral) instead of indigo
- "Upgrade" button: coral CTA

### Profile

- Each section (Branding, Details, Location, Hours, Staff Access, Tier, Appearance) is its own card
- Save Changes: coral CTA
- Staff PIN section: lock icon in header, coral "Set PIN / Update PIN" button
- Tier badge: coral pill
- Appearance card at bottom: contains ThemeToggle with label "Dark mode"

### Promotions

- "New Promotion" button: coral
- Promotion cards: new card pattern, discount text in coral
- TierGate overlay: coral "Upgrade Now" CTA
- PromotionForm slide-in: cream/surface background, coral Save button, new input styles

### Redemption

- Remove `min-h-screen bg-[#0a0f1a]` — Layout owns background
- Valid code result card: keep emerald green (universal success colour)
- "Next Customer" and "Check Code" buttons: coral
- Code input: new input style (large, centered, monospace kept)
- "Confirm Redemption": keep emerald (deliberate positive action)

---

## Functional Fixes

### 1. Staff Layout role

**File:** `venue-portal/src/App.tsx`

The `/redeem` route currently always passes `role="owner"` to `Layout`. Staff log in via PIN only — they have a staffAuth JWT in memory, not a Supabase session.

Fix: Add a small `RedeemRoute` wrapper component inside `App.tsx` (inside `<AuthProvider>` so it can call `useAuth()`):

```typescript
function RedeemRoute() {
  const { session } = useAuth()
  const role = !session && staffAuth.hasSession() ? 'staff' : 'owner'
  return (
    <ProtectedRoute>
      <Layout role={role}><Redemption /></Layout>
    </ProtectedRoute>
  )
}
```

Use `<RedeemRoute />` as the element for the `/redeem` route. This is necessary because `useAuth()` can only be called inside a component that lives inside `<AuthProvider>`.

### 2. Forgot password

**File:** `venue-portal/src/pages/Login.tsx`

Add a "Forgot password?" link below the password field in the owner tab. On click, if email is filled, call `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login' })` and show a "Check your email" confirmation message. If email is empty, focus the email field.

### 3. Register step guard

**File:** `venue-portal/src/components/ProtectedRoute.tsx` (or `Register.tsx`)

In `Register.tsx`, after session and venue are available, if `venue.registration_step >= 4`, redirect to `/dashboard`. This prevents a completed owner from re-entering the wizard manually.

---

## Files Changed

| Action | File |
|---|---|
| Create | `venue-portal/src/contexts/ThemeContext.tsx` |
| Create | `venue-portal/src/components/ThemeToggle.tsx` |
| Modify | `venue-portal/index.html` |
| Modify | `venue-portal/tailwind.config.js` |
| Modify | `venue-portal/src/index.css` |
| Modify | `venue-portal/src/main.tsx` | Wrap with ThemeProvider (outermost, outside AuthProvider) |
| — | — |
| Modify | `venue-portal/src/App.tsx` |
| Modify | `venue-portal/src/components/Sidebar.tsx` |
| Modify | `venue-portal/src/components/BottomTabBar.tsx` |
| Modify | `venue-portal/src/components/Layout.tsx` |
| Modify | `venue-portal/src/components/ProtectedRoute.tsx` |
| Modify | `venue-portal/src/components/StepIndicator.tsx` |
| Modify | `venue-portal/src/components/TierGate.tsx` |
| Modify | `venue-portal/src/components/PromotionForm.tsx` |
| Modify | `venue-portal/src/pages/Login.tsx` |
| Modify | `venue-portal/src/pages/Dashboard.tsx` |
| Modify | `venue-portal/src/pages/Profile.tsx` |
| Modify | `venue-portal/src/pages/Promotions.tsx` |
| Modify | `venue-portal/src/pages/Redemption.tsx` |
| Modify | `venue-portal/src/pages/auth/Register.tsx` |
| Modify | `venue-portal/src/pages/auth/steps/Step1Account.tsx` |
| Modify | `venue-portal/src/pages/auth/steps/Step2Details.tsx` |
| Modify | `venue-portal/src/pages/auth/steps/Step3Location.tsx` |
| Modify | `venue-portal/src/pages/auth/steps/Step4Tier.tsx` |

---

## Out of Scope

- No database schema changes
- No edge function changes
- No new routes or navigation items (theme toggle is in existing surfaces)
- No changes to the mobile app
- No HoursEditor or MapPicker visual updates (low-visibility utility components, defer)
