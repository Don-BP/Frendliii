---
title: Testing Patterns
tags: [testing, jest, vitest, supabase-mocks, vi-hoisted]
sources: [CC-Session-Logs/05-04-2026-18_00-venue-portal-4-plans.md, CC-Session-Logs/07-04-2026-10_00-safe-arrival-stage-4-deploy.md]
updated: 2026-04-09
---

# Testing Patterns

## Test Runners

- **frendli-api**: Jest
- **frendli-app**: Jest (with `@testing-library/react-hooks`)
- **venue-portal**: Vitest (`vi` global, not `jest`)

Same hook logic needs different test syntax for app vs venue-portal.

## vi.hoisted() Pattern (Vitest)

Required when a `vi.mock()` factory needs to reference test-local variables. The factory is hoisted above imports, so local `const` declarations are not yet initialized.

```typescript
const { mockFrom, mockUpsert } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockFrom }),
}))
```

**Do NOT** set `mockResolvedValue` inside the `vi.mock()` factory — factory runs per `from()` call, so defaults get reapplied on every invocation, overwriting per-test setup. Set defaults in `beforeEach` instead.

## Supabase Chainable Mock Pattern (Vitest)

Hooks that chain `.select().eq().order()` need a thenable mock so `await query` resolves correctly regardless of chain depth.

```typescript
function makeChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'update', 'insert']
  methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain) })
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(resolvedValue).then(resolve)
  return chain
}
```

For **table-aware mocks** (hook queries multiple tables):
```typescript
mockFrom.mockImplementation((table: string) => {
  if (table === 'venue_reports') return makeChain({ data: [], error: null })
  return makeChain({ data: settingsShape, error: null })
})
```

A single generic chain fails when one table returns an array and another returns an object — `.some is not a function` error.

## UTC vs Local Hours

Always use `getUTCHours()` — not `getHours()` — for test date assertions involving hourly buckets. `getHours()` returns local time and breaks in different timezones.

```typescript
// Bad — breaks in non-UTC environments
const hour = new Date(Date.UTC(2026, 0, 1, 14, 0, 0)).getHours()

// Good
const hour = new Date(Date.UTC(2026, 0, 1, 14, 0, 0)).getUTCHours() // always 14
```

## Relative Date Helpers

For tests with windowed queries (e.g. "last 30 days"), use relative dates not static ones:

```typescript
function recentDate(daysAgo: number, hour: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setUTCHours(hour, 0, 0, 0)
  return d.toISOString()
}
```

Static dates eventually fall outside the window and tests silently start returning empty results.

## Jest Double `.eq()` Chain Bug

`await supabase.from(...).update(...).eq('field1', x).eq('field2', y)` — the first `.eq()` call consumes `mockResolvedValueOnce`, leaving the second `.eq()` with no mock value.

**Fix**: restructure the route to use two separate `await` calls, each terminating on a single `.eq()` or `.single()`:

```typescript
// Bad
await supabaseAdmin.from('t').update(data).eq('user_id', uid).eq('hangout_id', hid)

// Good
await supabaseAdmin.from('t').update({ field1: val }).eq('user_id', uid)
await supabaseAdmin.from('t').update({ field2: val }).eq('hangout_id', hid)
```
