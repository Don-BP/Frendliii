# Promotion Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `is_active: boolean` column on `venue_promotions` with a `status` enum (`draft | active | ended`), enforce per-tier promotion limits (Listed=0, Perks=2, Premier=4), and update the Promotions UI to show three distinct sections.

**Architecture:** A single Supabase migration adds the `status` column, migrates existing data, and drops `is_active`. The `redeem-coupon` edge function is updated before the migration runs to avoid any broken validation window. The `usePromotions` hook is updated to expose explicit `activatePromotion`/`endPromotion` actions and a `canActivate` flag. The Promotions page is updated to render Draft / Active / Ended sections.

**Tech Stack:** PostgreSQL, Supabase Edge Functions (Deno), React, TypeScript, Vitest

---

## Deployment Order (Critical)

1. Deploy updated `redeem-coupon` edge function (supports both `is_active` and `status`)
2. Run Supabase migration (adds `status`, migrates data, drops `is_active`)
3. Deploy venue portal (updated types, hook, UI)

**Do not reverse this order.** Running the migration before updating the edge function will break coupon validation.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `supabase/functions/redeem-coupon/index.ts` | Update to check `status = 'active'` instead of `is_active = true` |
| Create | `supabase/migrations/20260405000002_promotion_status.sql` | Add status column, migrate data, drop is_active |
| Modify | `venue-portal/src/lib/types.ts` | Replace `is_active: boolean` with `status: PromotionStatus` |
| Modify | `venue-portal/src/hooks/usePromotions.ts` | Add activatePromotion, endPromotion, canActivate, tierLimit |
| Modify | `venue-portal/src/hooks/__tests__/usePromotions.test.ts` | Update tests for new API |
| Modify | `venue-portal/src/pages/Promotions.tsx` | Three sections, tier limit UI |
| Modify | `venue-portal/src/components/PromotionForm.tsx` | Remove active/inactive toggle, default to draft |

---

### Task 1: Update redeem-coupon edge function

**Files:**
- Modify: `supabase/functions/redeem-coupon/index.ts`

- [ ] **Step 1: Read the current edge function**

Read `supabase/functions/redeem-coupon/index.ts` in full before editing.

- [ ] **Step 2: Update the validity check**

Find the line(s) where `is_active` is checked (likely something like `.eq('is_active', true)`).

Replace with a check that works with the new `status` column. Use `.eq('status', 'active')` — after the migration this is the canonical check. Since the edge function is deployed before the migration, also handle the transition period by checking either condition:

Find and replace the Supabase query that validates the promotion. Change:
```typescript
.eq('is_active', true)
```
to:
```typescript
.eq('status', 'active')
```

Note: This will only work correctly after the migration runs. That is intentional — the edge function is deployed first, then the migration adds and populates the `status` column immediately after.

- [ ] **Step 3: Deploy the edge function**

```bash
cd e:/Frendli
npx supabase functions deploy redeem-coupon
```

Expected: `Deployed Function redeem-coupon`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/redeem-coupon/index.ts
git commit -m "feat(supabase): update redeem-coupon to check status instead of is_active"
```

---

### Task 2: Create and run the migration

**Files:**
- Create: `supabase/migrations/20260405000002_promotion_status.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260405000002_promotion_status.sql`:

```sql
-- Step 1: Add status column (default 'draft' so existing rows get a value)
ALTER TABLE venue_promotions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'ended'));

-- Step 2: Migrate existing data
UPDATE venue_promotions
  SET status = CASE
    WHEN is_active = true AND valid_until > now() THEN 'active'
    ELSE 'ended'
  END;

-- Step 3: Remove default now that data is migrated
ALTER TABLE venue_promotions ALTER COLUMN status DROP DEFAULT;

-- Step 4: Drop is_active
ALTER TABLE venue_promotions DROP COLUMN IF EXISTS is_active;
```

- [ ] **Step 2: Apply the migration**

```bash
cd e:/Frendli
npx supabase db push
```

Expected: Migration applied with no errors.

- [ ] **Step 3: Verify the migration**

```bash
echo '{"action":"get","params":{"route":"/api/venue-promotions"}}' | bash .claude/cli/tools/frendli-api.sh
```

Confirm the response objects have `status` field (not `is_active`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260405000002_promotion_status.sql
git commit -m "feat(supabase): replace is_active with status enum on venue_promotions"
```

---

### Task 3: Update TypeScript types

**Files:**
- Modify: `venue-portal/src/lib/types.ts`

- [ ] **Step 1: Read types.ts**

Read `venue-portal/src/lib/types.ts` in full.

- [ ] **Step 2: Update VenuePromotion type**

Find `VenuePromotion` interface and replace `is_active: boolean` with the status enum:

```typescript
export type PromotionStatus = 'draft' | 'active' | 'ended'

export interface VenuePromotion {
  id: string
  venue_id: string
  title: string
  description: string
  discount: string
  valid_until: string
  coupon_code: string
  status: PromotionStatus
  created_at: string
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd venue-portal
npx tsc --noEmit
```

Expected: Errors listing every place `is_active` is referenced — these will be fixed in Tasks 4 and 5.

- [ ] **Step 4: Commit the type change**

```bash
git add venue-portal/src/lib/types.ts
git commit -m "feat(venue-portal): replace VenuePromotion.is_active with status PromotionStatus"
```

---

### Task 4: Update usePromotions hook (TDD)

**Files:**
- Modify: `venue-portal/src/hooks/__tests__/usePromotions.test.ts`
- Modify: `venue-portal/src/hooks/usePromotions.ts`

- [ ] **Step 1: Read the existing hook and its tests**

Read `venue-portal/src/hooks/usePromotions.ts` and `venue-portal/src/hooks/__tests__/usePromotions.test.ts` in full.

- [ ] **Step 2: Write new/updated failing tests**

Add or replace tests in `venue-portal/src/hooks/__tests__/usePromotions.test.ts` to cover the new API:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePromotions } from '../usePromotions'

const mockUpdate = vi.fn().mockResolvedValue({ error: null })
const mockEq = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockOrder = vi.fn()

function makePromotion(overrides: Partial<{
  id: string; status: string; valid_until: string
}> = {}) {
  return {
    id: 'promo-1',
    venue_id: 'venue-1',
    title: 'Test Promo',
    description: '',
    discount: '10%',
    valid_until: new Date(Date.now() + 86400000).toISOString(),
    coupon_code: 'ABC123',
    status: 'draft',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      order: mockOrder.mockResolvedValue({ data: [makePromotion()], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [makePromotion()], error: null }),
      update: mockUpdate.mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: makePromotion(), error: null }),
    })),
  },
}))

describe('usePromotions — canActivate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('canActivate is true when activeCount < tierLimit for perks tier', async () => {
    const { result } = renderHook(() =>
      usePromotions('venue-1', 'perks')
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    // 0 active promotions, perks limit = 2 → canActivate = true
    expect(result.current.canActivate).toBe(true)
  })

  it('canActivate is false when activeCount >= tierLimit', async () => {
    // Two active promotions
    const future = new Date(Date.now() + 86400000).toISOString()
    mockOrder.mockResolvedValue({
      data: [
        makePromotion({ id: 'p1', status: 'active', valid_until: future }),
        makePromotion({ id: 'p2', status: 'active', valid_until: future }),
      ],
      error: null,
    })
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canActivate).toBe(false)
  })
})

describe('usePromotions — activatePromotion', () => {
  it('calls update with status=active', async () => {
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.activatePromotion('promo-1')
    })

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'active' })
  })

  it('throws when canActivate is false', async () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    mockOrder.mockResolvedValue({
      data: [
        makePromotion({ id: 'p1', status: 'active', valid_until: future }),
        makePromotion({ id: 'p2', status: 'active', valid_until: future }),
      ],
      error: null,
    })
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      act(async () => { await result.current.activatePromotion('promo-1') })
    ).rejects.toThrow('active promotion limit')
  })
})

describe('usePromotions — endPromotion', () => {
  it('calls update with status=ended', async () => {
    const { result } = renderHook(() => usePromotions('venue-1', 'perks'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.endPromotion('promo-1')
    })

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'ended' })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd venue-portal
npm test -- usePromotions
```

Expected: FAIL — API mismatch (hook still uses `is_active`, `togglePromotion`)

- [ ] **Step 4: Update usePromotions.ts**

Read the existing hook, then replace its content:

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { VenuePromotion } from '../lib/types'

type Tier = 'listed' | 'perks' | 'premier'

const TIER_LIMITS: Record<Tier, number> = {
  listed: 0,
  perks: 2,
  premier: 4,
}

interface PromotionsHook {
  loading: boolean
  promotions: VenuePromotion[]
  activeCount: number
  tierLimit: number
  canActivate: boolean
  createPromotion: (data: Omit<VenuePromotion, 'id' | 'venue_id' | 'status' | 'created_at'>) => Promise<void>
  updatePromotion: (id: string, data: Partial<Omit<VenuePromotion, 'id' | 'venue_id' | 'status' | 'created_at'>>) => Promise<void>
  activatePromotion: (id: string) => Promise<void>
  endPromotion: (id: string) => Promise<void>
}

export function usePromotions(venueId: string | undefined, tier: Tier = 'listed'): PromotionsHook {
  const [loading, setLoading] = useState(true)
  const [promotions, setPromotions] = useState<VenuePromotion[]>([])

  const tierLimit = TIER_LIMITS[tier]
  const activeCount = promotions.filter(
    p => p.status === 'active' && new Date(p.valid_until) > new Date()
  ).length
  const canActivate = activeCount < tierLimit

  useEffect(() => {
    if (!venueId) { setLoading(false); return }

    supabase
      .from('venue_promotions')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPromotions((data ?? []) as VenuePromotion[])
        setLoading(false)
      })
  }, [venueId])

  const createPromotion = useCallback(async (
    data: Omit<VenuePromotion, 'id' | 'venue_id' | 'status' | 'created_at'>
  ) => {
    if (!venueId) return
    const { data: created } = await supabase
      .from('venue_promotions')
      .insert({ ...data, venue_id: venueId, status: 'draft' })
      .select()
      .single()
    if (created) setPromotions(prev => [created as VenuePromotion, ...prev])
  }, [venueId])

  const updatePromotion = useCallback(async (
    id: string,
    data: Partial<Omit<VenuePromotion, 'id' | 'venue_id' | 'status' | 'created_at'>>
  ) => {
    await supabase.from('venue_promotions').update(data).eq('id', id)
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }, [])

  const activatePromotion = useCallback(async (id: string) => {
    if (!canActivate) throw new Error(`You've reached your ${tierLimit} active promotion limit`)
    await supabase.from('venue_promotions').update({ status: 'active' }).eq('id', id)
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: 'active' } : p))
  }, [canActivate, tierLimit])

  const endPromotion = useCallback(async (id: string) => {
    await supabase.from('venue_promotions').update({ status: 'ended' }).eq('id', id)
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: 'ended' } : p))
  }, [])

  return { loading, promotions, activeCount, tierLimit, canActivate, createPromotion, updatePromotion, activatePromotion, endPromotion }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd venue-portal
npm test -- usePromotions
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add venue-portal/src/hooks/usePromotions.ts venue-portal/src/hooks/__tests__/usePromotions.test.ts
git commit -m "feat(venue-portal): update usePromotions with status API, activatePromotion, endPromotion, canActivate"
```

---

### Task 5: Update Promotions.tsx — three sections + tier limit UI

**Files:**
- Modify: `venue-portal/src/pages/Promotions.tsx`
- Modify: `venue-portal/src/components/PromotionForm.tsx`

- [ ] **Step 1: Read Promotions.tsx and PromotionForm.tsx in full**

Read both files before editing.

- [ ] **Step 2: Update Promotions.tsx**

Replace the content of `venue-portal/src/pages/Promotions.tsx`:

```typescript
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePromotions } from '../hooks/usePromotions'
import { TierGate } from '../components/TierGate'
import { PromotionForm } from '../components/PromotionForm'
import type { VenuePromotion } from '../lib/types'

type EditTarget = VenuePromotion | 'new' | null

export default function Promotions() {
  const { venue } = useAuth()
  const tier = (venue?.tier ?? 'listed') as 'listed' | 'perks' | 'premier'
  const { promotions, loading, canActivate, tierLimit, createPromotion, updatePromotion, activatePromotion, endPromotion } = usePromotions(venue?.id, tier)
  const [formTarget, setFormTarget] = useState<EditTarget>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!venue) return null

  const now = new Date()
  const activePromos = promotions.filter(p => p.status === 'active' && new Date(p.valid_until) > now)
  const draftPromos  = promotions.filter(p => p.status === 'draft')
  const endedPromos  = promotions.filter(p => p.status === 'ended' || (p.status === 'active' && new Date(p.valid_until) <= now))

  const handleFormSubmit = async (data: Parameters<typeof createPromotion>[0]) => {
    setActionError(null)
    if (formTarget === 'new') {
      await createPromotion(data)
    } else if (formTarget) {
      await updatePromotion((formTarget as VenuePromotion).id, data)
    }
    setFormTarget(null)
  }

  const handleActivate = async (id: string) => {
    setActionError(null)
    try { await activatePromotion(id) }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Error') }
  }

  const handleEnd = async (id: string) => {
    setActionError(null)
    try { await endPromotion(id) }
    catch (e) { setActionError(e instanceof Error ? e.message : 'Error') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="h-0.5 bg-gradient-to-r from-[#FF7F61] to-[#2D1E4B] mb-6 rounded-full" />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-['Bricolage_Grotesque'] font-bold text-[#2D1E4B] dark:text-[#F0EBF8]">Promotions</h1>
        <button
          onClick={() => setFormTarget('new')}
          disabled={!canActivate}
          title={!canActivate ? `You've reached your ${tierLimit} active promotion limit` : undefined}
          className="flex items-center gap-2 bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(255,127,97,0.35)]"
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
            {actionError && (
              <p className="text-red-500 dark:text-red-400 text-sm">{actionError}</p>
            )}

            {!canActivate && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  You've reached your {tierLimit} active promotion limit. End a promotion to activate a new one.
                </p>
              </div>
            )}

            {/* Active section */}
            <section>
              <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">
                Active ({activePromos.length}/{tierLimit})
              </h2>
              {activePromos.length === 0
                ? <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">No active promotions.</p>
                : <div className="space-y-3">
                    {activePromos.map(p => (
                      <PromotionCard key={p.id} promotion={p} onEnd={() => handleEnd(p.id)} />
                    ))}
                  </div>
              }
            </section>

            {/* Draft section */}
            <section>
              <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">
                Draft
              </h2>
              {draftPromos.length === 0
                ? <p className="text-[#8E8271] dark:text-[#9E8FC0] text-sm">No draft promotions.</p>
                : <div className="space-y-3">
                    {draftPromos.map(p => (
                      <PromotionCard
                        key={p.id}
                        promotion={p}
                        onEdit={() => setFormTarget(p)}
                        onActivate={() => handleActivate(p.id)}
                        canActivate={canActivate}
                        tierLimit={tierLimit}
                      />
                    ))}
                  </div>
              }
            </section>

            {/* Ended section */}
            {endedPromos.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-[#8E8271] dark:text-[#9E8FC0] uppercase tracking-wider mb-3">
                  Ended
                </h2>
                <div className="space-y-3">
                  {endedPromos.map(p => (
                    <PromotionCard key={p.id} promotion={p} />
                  ))}
                </div>
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

function PromotionCard({
  promotion: p,
  onEdit,
  onActivate,
  onEnd,
  canActivate,
  tierLimit,
}: {
  promotion: VenuePromotion
  onEdit?: () => void
  onActivate?: () => void
  onEnd?: () => void
  canActivate?: boolean
  tierLimit?: number
}) {
  const { format } = require('date-fns')
  const expired = new Date(p.valid_until) <= new Date()

  const statusBadge = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    draft:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    ended:  'bg-[#EEEAE3] dark:bg-[#2D1E4B] text-[#8E8271] dark:text-[#9E8FC0]',
  }[p.status]

  return (
    <div className="bg-white dark:bg-[#251A38] border border-[#EEEAE3] dark:border-[#3D2E55] rounded-2xl p-4 flex items-start justify-between gap-4 shadow-[0_4px_20px_rgba(45,30,75,0.06)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-[#2D1E4B] dark:text-[#F0EBF8] truncate">{p.title}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge}`}>
            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
        </div>
        <p className="text-sm text-[#FF7F61] font-semibold">{p.discount}</p>
        <p className="text-xs text-[#8E8271] dark:text-[#9E8FC0] mt-1">
          {expired ? 'Expired' : 'Expires'} {format(new Date(p.valid_until), 'MMM d, yyyy')}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-sm text-[#8E8271] dark:text-[#9E8FC0] hover:text-[#2D1E4B] dark:hover:text-[#F0EBF8] font-medium transition-colors px-3 py-1.5 rounded-lg border border-[#EEEAE3] dark:border-[#3D2E55]"
          >
            Edit
          </button>
        )}
        {onActivate && (
          <button
            onClick={onActivate}
            disabled={!canActivate}
            title={!canActivate ? `Limit reached (${tierLimit} active max)` : undefined}
            className="text-sm bg-[#FF7F61] hover:bg-[#E6684B] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Activate
          </button>
        )}
        {onEnd && (
          <button
            onClick={onEnd}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800"
          >
            End
          </button>
        )}
      </div>
    </div>
  )
}
```

Note: Replace the `require('date-fns')` with a proper import at the top of the file: `import { format } from 'date-fns'`.

- [ ] **Step 3: Update PromotionForm to remove is_active toggle**

Read `venue-portal/src/components/PromotionForm.tsx`. Remove any `is_active` toggle or checkbox — new promotions always start as draft, status is managed via card buttons. If the form has an `is_active` field, delete it.

- [ ] **Step 4: Run the full test suite**

```bash
cd venue-portal
npm test
```

Expected: All tests pass. Fix any remaining `is_active` references until the suite is clean.

- [ ] **Step 5: Run TypeScript check**

```bash
cd venue-portal
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add venue-portal/src/pages/Promotions.tsx venue-portal/src/components/PromotionForm.tsx
git commit -m "feat(venue-portal): update Promotions UI — 3 sections, tier limits, activate/end actions"
```
