---
title: Stripe ID Verification
tags: [stripe, safety, verification, expo-web-browser]
sources: [CC-Session-Logs/04-04-2026-22_27-stripe-id-verification.md]
updated: 2026-04-09
---

# Stripe ID Verification

Optional ID verification for Frendli users. Adds a "Verified" badge to their profile and discover card.

## Key Decisions

- **Stripe Identity** (ID + face match) — strongest trust signal for IRL meetups
- **No data stored** — only `"ID Verified"` written to `Profile.safetyBadges[]`. Frendli never stores ID images or personal data.
- **$1.99 one-time for free users, free for Plus/Pro** — hybrid monetization
- **Optional, not mandatory** — verified badge is a trust signal, not a usage gate
- **Badge shown on Profile + Discover card** — at the decision point, not in chat

## Technical Approach

**`expo-web-browser` not `@stripe/stripe-react-native`** — `@stripe/stripe-react-native` v0.50.3 does NOT have `verifyIdentity()`. Correct approach: open Stripe's hosted verification URL via `WebBrowser.openBrowserAsync()`.

**Stripe API version `2026-03-25.dahlia`** — required by Stripe SDK v21. `.dahlia` is stable, not preview.

**`payment_pending` state** — handles edge case where user pays but dismisses the browser before completing the ID scan. Prevents silent double-charging on retry.

## Flow

1. User taps "Get Verified" on profile
2. API creates PaymentIntent + VerificationSession
3. App opens Stripe hosted URL via `expo-web-browser`
4. On return: API webhook confirms completion, writes `"ID Verified"` to `safetyBadges`

## Key Files

- `frendli-app/app/safety/id-verification.tsx` — screen: payment + browser flow
- `frendli-app/app/(tabs)/profile.tsx` — "Get Verified" entry point
- `frendli-app/components/discover/DiscoverHeroCard.tsx` — verified badge display
- `frendli-api/src/routes/verification.ts` — Stripe Identity + payment route
- `frendli-api/src/routes/__tests__/` — Jest tests (TDD: tests written first)

## Stripe Config Note

Raw-body middleware must be registered for the Stripe webhook route before `express.json()` parses the body — otherwise signature verification fails.
