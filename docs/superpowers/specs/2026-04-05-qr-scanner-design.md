# QR Scanner — Design Spec
**Date:** 2026-04-05
**Area:** venue-portal
**Priority:** Critical

## Overview

Add QR code scanning to the Redemption page alongside the existing manual 6-character code entry. Staff point a camera at a customer's in-app coupon QR code; the scanner reads it and immediately shows a valid/invalid/already-redeemed result with no extra taps required.

## Requirements

- Works on mobile browsers (iOS Safari, Android Chrome) and desktop browsers with a webcam
- Sits alongside manual entry — neither replaces the other
- Auto-submits on a successful scan (no "Check Code" button tap needed)
- QR code encodes the 6-character alphanumeric code (same character set as manual entry: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
- All validation logic (active period, used/unused, mark as redeemed) is unchanged — handled by the existing `redeem-coupon` Supabase edge function
- No backend changes required

## Library

**`html5-qrcode`** — cross-platform, supports iOS Safari and Android Chrome, works with device cameras and desktop webcams. Added to `venue-portal/package.json`.

## UI Design

The Redemption page gains two tabs at the top of the input area:

- **Enter Code** (default) — existing manual text input, unchanged
- **Scan QR Code** — camera viewfinder

Switching tabs is instant; no navigation. The tabs use the existing Frendli design system (accent `#FF7F61`, dark mode support, `Bricolage Grotesque` font).

### Scan Mode

- Camera viewfinder fills the input area with a scan-region overlay
- Scanner runs continuously once the tab is active; stops when switching away
- On successful read: extract the 6-character code, run `handleCheckCode()`, display result in the existing check_result UI
- Camera is released when the user navigates away or switches to manual tab

### Error States

| Condition | Behaviour |
|---|---|
| Camera permission denied | Friendly message: "Camera access is required to scan. Please allow camera access in your browser settings." + link to manual entry tab |
| No camera available (desktop without webcam) | Scan tab is hidden on mount; manual entry shown by default |
| QR content not a valid 6-char code | Inline message: "Unrecognised code — try manual entry" |
| Scan times out (no code found after 30s) | Soft message: "Nothing scanned yet — point the camera at the QR code" |

## Component Changes

### `venue-portal/src/pages/Redemption.tsx`

- Add `scanMode` boolean state, toggled by the two tabs
- Add `<QrScanner>` component (see below) rendered when `scanMode = true`
- `handleScanSuccess(code: string)` — validates the 6-char format, calls `handleCheckCode()` with the scanned code
- Tab UI above the input area; tabs hidden on `confirmed` state (after redemption)

### `venue-portal/src/components/QrScanner.tsx` (new)

A focused wrapper around `html5-qrcode`:

```
props:
  onSuccess: (code: string) => void
  onError?: (message: string) => void
```

- Initialises scanner on mount, stops and cleans up on unmount
- Exposes no internal state to parent — just calls `onSuccess` with the raw decoded string
- Handles camera permission check internally; calls `onError` with a human-readable message on failure

## Data Flow

```
Staff opens Scan tab
  → QrScanner mounts, requests camera permission
  → Continuous scan loop starts
  → QR code detected → raw string decoded
  → handleScanSuccess() validates 6-char format
  → handleCheckCode() called with code
  → Existing redeem-coupon edge function validates
  → Check result UI shown (valid / already_redeemed / invalid / expired)
  → If valid: staff taps Confirm → handleConfirm() → confirmed UI
```

## Dependencies

- `html5-qrcode` added to `venue-portal/package.json`
- No new Supabase tables, edge functions, or API routes

## Testing

- Unit test: `QrScanner` calls `onSuccess` with decoded string
- Unit test: `handleScanSuccess` rejects strings that don't match the 6-char pattern
- Unit test: scan tab hidden when no camera detected
- Manual smoke test: scan a valid QR code on iOS Safari and Android Chrome
