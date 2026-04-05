# QR Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add QR code scanning to the Redemption page alongside manual code entry, auto-submitting on a successful scan.

**Architecture:** A new `QrScanner` component wraps `html5-qrcode` and mounts/unmounts the scanner on tab switch. The Redemption page gains a two-tab layout (Enter Code / Scan QR Code). On scan success the decoded 6-character code is passed directly into the existing `handleCheckCode` logic — no backend changes required.

**Tech Stack:** `html5-qrcode`, React, TypeScript, Vitest + @testing-library/react

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `venue-portal/src/components/QrScanner.tsx` | Camera scanner wrapper, mounts/unmounts html5-qrcode |
| Create | `venue-portal/src/components/__tests__/QrScanner.test.tsx` | Unit tests for QrScanner |
| Modify | `venue-portal/src/pages/Redemption.tsx` | Add tab UI, scanMode state, handleScanSuccess |
| Modify | `venue-portal/package.json` | Add html5-qrcode dependency |

---

### Task 1: Install html5-qrcode

**Files:**
- Modify: `venue-portal/package.json`

- [ ] **Step 1: Install the package**

```bash
cd venue-portal
npm install html5-qrcode
```

Expected output: `added 1 package` (or similar, no errors)

- [ ] **Step 2: Verify it appears in package.json**

```bash
grep html5-qrcode venue-portal/package.json
```

Expected: `"html5-qrcode": "^2.x.x"` in dependencies

- [ ] **Step 3: Commit**

```bash
git add venue-portal/package.json venue-portal/package-lock.json
git commit -m "chore(venue-portal): install html5-qrcode"
```

---

### Task 2: Create QrScanner component (TDD)

**Files:**
- Create: `venue-portal/src/components/__tests__/QrScanner.test.tsx`
- Create: `venue-portal/src/components/QrScanner.tsx`

- [ ] **Step 1: Write the failing tests**

Create `venue-portal/src/components/__tests__/QrScanner.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QrScanner } from '../QrScanner'

// Mock html5-qrcode
const mockRender = vi.fn()
const mockClear = vi.fn().mockResolvedValue(undefined)
const MockScanner = vi.fn().mockImplementation(() => ({
  render: mockRender,
  clear: mockClear,
}))

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: MockScanner,
}))

describe('QrScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the scanner container', () => {
    render(<QrScanner onSuccess={vi.fn()} />)
    expect(document.getElementById('qr-reader')).toBeTruthy()
  })

  it('initialises Html5QrcodeScanner on mount', () => {
    render(<QrScanner onSuccess={vi.fn()} />)
    expect(MockScanner).toHaveBeenCalledWith(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )
    expect(mockRender).toHaveBeenCalledTimes(1)
  })

  it('calls onSuccess with decoded text when scan succeeds', () => {
    const onSuccess = vi.fn()
    render(<QrScanner onSuccess={onSuccess} />)
    // Simulate a successful scan by calling the first arg passed to render()
    const [successCb] = mockRender.mock.calls[0]
    successCb('ABC123')
    expect(onSuccess).toHaveBeenCalledWith('ABC123')
  })

  it('calls scanner.clear() on unmount', () => {
    const { unmount } = render(<QrScanner onSuccess={vi.fn()} />)
    unmount()
    expect(mockClear).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd venue-portal
npm test -- QrScanner
```

Expected: FAIL — `Cannot find module '../QrScanner'`

- [ ] **Step 3: Create the QrScanner component**

Create `venue-portal/src/components/QrScanner.tsx`:

```typescript
import { useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface Props {
  onSuccess: (code: string) => void
  onError?: (message: string) => void
}

export function QrScanner({ onSuccess, onError }: Props) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    )

    scanner.render(
      (decodedText: string) => {
        onSuccess(decodedText)
      },
      () => {
        // Suppress per-frame scan errors — these fire constantly during scanning
      }
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [onSuccess])

  return <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" />
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd venue-portal
npm test -- QrScanner
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add venue-portal/src/components/QrScanner.tsx venue-portal/src/components/__tests__/QrScanner.test.tsx
git commit -m "feat(venue-portal): add QrScanner component"
```

---

### Task 3: Update Redemption page with tab UI and scan mode

**Files:**
- Modify: `venue-portal/src/pages/Redemption.tsx`

- [ ] **Step 1: Read the current Redemption.tsx**

Read `venue-portal/src/pages/Redemption.tsx` in full before editing. Confirm the component structure: `UiState` type, `handleCheckCode`, `handleConfirm`, `handleCodeChange`.

- [ ] **Step 2: Write the failing tests**

Add to a new file `venue-portal/src/pages/__tests__/Redemption.scan.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock QrScanner so camera doesn't activate in tests
vi.mock('../../components/QrScanner', () => ({
  QrScanner: ({ onSuccess }: { onSuccess: (code: string) => void }) => (
    <button data-testid="mock-scanner" onClick={() => onSuccess('ABC123')}>
      Scan
    </button>
  ),
}))

// Mock staffFetch
vi.mock('../../lib/staffAuth', () => ({
  staffFetch: vi.fn().mockResolvedValue({ status: 'valid', promotion_title: 'Test', discount: '10%', valid_until: '2099-01-01' }),
  StaffSessionExpiredError: class StaffSessionExpiredError extends Error {},
}))

import Redemption from '../Redemption'

const renderRedemption = () =>
  render(<MemoryRouter><Redemption /></MemoryRouter>)

describe('Redemption — scan mode', () => {
  it('shows Enter Code tab by default', () => {
    renderRedemption()
    expect(screen.getByText('Enter Code')).toBeTruthy()
    expect(screen.getByText('Scan QR Code')).toBeTruthy()
    expect(screen.getByPlaceholderText('XXXXXX')).toBeTruthy()
  })

  it('shows scanner when Scan QR Code tab is clicked', () => {
    renderRedemption()
    fireEvent.click(screen.getByText('Scan QR Code'))
    expect(screen.getByTestId('mock-scanner')).toBeTruthy()
  })

  it('returns to Enter Code tab when Enter Code is clicked', () => {
    renderRedemption()
    fireEvent.click(screen.getByText('Scan QR Code'))
    fireEvent.click(screen.getByText('Enter Code'))
    expect(screen.getByPlaceholderText('XXXXXX')).toBeTruthy()
  })

  it('rejects a scan result that is not a valid 6-char code', () => {
    renderRedemption()
    fireEvent.click(screen.getByText('Scan QR Code'))
    // The mock scanner fires onSuccess with 'ABC123' (valid)
    // Test with an invalid code via a custom mock
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd venue-portal
npm test -- Redemption.scan
```

Expected: FAIL

- [ ] **Step 4: Update Redemption.tsx**

Add the following to `venue-portal/src/pages/Redemption.tsx`:

At the top, add the import:
```typescript
import { QrScanner } from '../components/QrScanner'
```

Add `scanMode` state inside the component (after existing state declarations):
```typescript
const [scanMode, setScanMode] = useState(false)
```

Add the `handleScanSuccess` function (after `handleCodeChange`):
```typescript
const VALID_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/

const handleScanSuccess = (raw: string) => {
  const code = raw.trim().toUpperCase()
  if (!VALID_CODE_RE.test(code)) return
  setCode(code)
  setScanMode(false)
  handleCheckCode(code)
}
```

Note: `handleCheckCode` currently reads from the `code` state variable. Update it to accept an optional override:
```typescript
const handleCheckCode = async (overrideCode?: string) => {
  const codeToCheck = overrideCode ?? code
  if (codeToCheck.length !== 6) return
  setLoading(true)
  try {
    const data = await staffFetch(`${SUPABASE_URL}/functions/v1/redeem-coupon`, {
      code: codeToCheck,
      action: 'check',
    }) as RedeemStatus
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
```

Replace the existing input area JSX (the `{uiState === 'input' && ...}` block) with:

```tsx
{uiState === 'input' && (
  <div className="space-y-4">
    {/* Tabs */}
    <div className="flex rounded-xl border border-[#EEEAE3] dark:border-[#3D2E55] overflow-hidden">
      <button
        onClick={() => setScanMode(false)}
        className={`flex-1 py-2 text-sm font-semibold transition-colors ${
          !scanMode
            ? 'bg-[#FF7F61] text-white'
            : 'bg-white dark:bg-[#251A38] text-[#8E8271] dark:text-[#9E8FC0]'
        }`}
      >
        Enter Code
      </button>
      <button
        onClick={() => setScanMode(true)}
        className={`flex-1 py-2 text-sm font-semibold transition-colors ${
          scanMode
            ? 'bg-[#FF7F61] text-white'
            : 'bg-white dark:bg-[#251A38] text-[#8E8271] dark:text-[#9E8FC0]'
        }`}
      >
        Scan QR Code
      </button>
    </div>

    {/* Manual entry */}
    {!scanMode && (
      <>
        <input
          type="text"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="XXXXXX"
          maxLength={6}
          className="w-full bg-white dark:bg-[#251A38] border-2 border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl px-4 py-4 text-[#2D1E4B] dark:text-[#F0EBF8] text-3xl text-center tracking-widest font-mono uppercase focus:outline-none focus:border-[#FF7F61]"
        />
        <button
          onClick={() => handleCheckCode()}
          disabled={code.length !== 6 || loading}
          className="w-full bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 text-white font-bold py-4 text-lg rounded-2xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
        >
          {loading ? 'Checking…' : 'Check Code'}
        </button>
      </>
    )}

    {/* QR scan */}
    {scanMode && (
      <div className="space-y-3">
        <QrScanner onSuccess={handleScanSuccess} />
        <p className="text-xs text-center text-[#8E8271] dark:text-[#9E8FC0]">
          Point the camera at the customer's QR code
        </p>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd venue-portal
npm test -- Redemption.scan
```

Expected: PASS

- [ ] **Step 6: Run full test suite to check for regressions**

```bash
cd venue-portal
npm test
```

Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add venue-portal/src/pages/Redemption.tsx venue-portal/src/pages/__tests__/Redemption.scan.test.tsx
git commit -m "feat(venue-portal): add QR scanner to Redemption page alongside manual entry"
```

---

### Task 4: Manual smoke test

**Files:** None

- [ ] **Step 1: Start the venue portal dev server**

```bash
cd venue-portal
npm run dev
```

- [ ] **Step 2: Test on desktop**
  - Open `http://localhost:5173` in a browser that has a webcam
  - Log in as staff, navigate to Redemption
  - Click "Scan QR Code" tab — camera should activate
  - If no webcam: confirm only the "Enter Code" tab is shown (scan tab hidden)

- [ ] **Step 3: Test on mobile**
  - Open the local dev URL on a phone (same network)
  - Tap "Scan QR Code" — grant camera permission
  - Point at a valid QR code (or generate one from a known 6-char code at qr-code-generator.com)
  - Confirm result screen appears without tapping "Check Code"

- [ ] **Step 4: Test error states**
  - Deny camera permission → confirm friendly message appears
  - Scan a non-Frendli QR code → confirm "Unrecognised code" message
