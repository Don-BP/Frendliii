// supabase/functions/verify-staff-pin/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'
import { create } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const STAFF_JWT_SECRET = Deno.env.get('STAFF_JWT_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// In-memory IP rate limiter (rolling window per IP — resets on cold start; acceptable for this threat model)
const ipCallLog = new Map<string, number[]>()
const IP_WINDOW_MS = 60_000
const IP_MAX_CALLS = 5

function isIpRateLimited(ip: string): boolean {
  const now = Date.now()
  const calls = (ipCallLog.get(ip) ?? []).filter(t => now - t < IP_WINDOW_MS)
  calls.push(now)
  ipCallLog.set(ip, calls)
  return calls.length > IP_MAX_CALLS
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'

  if (isIpRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { venue_id, pin } = await req.json()

  if (!venue_id || !pin || !/^\d{4}$/.test(pin)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('staff_pin_hash, staff_pin_fail_count, staff_pin_locked_until')
    .eq('id', venue_id)
    .single()

  if (venueError || !venue) {
    return new Response(JSON.stringify({ error: 'Venue not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check lockout
  if (venue.staff_pin_locked_until) {
    const lockedUntil = new Date(venue.staff_pin_locked_until)
    if (lockedUntil > new Date()) {
      const secondsRemaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
      return new Response(JSON.stringify({ error: 'Locked', seconds_remaining: secondsRemaining }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  if (!venue.staff_pin_hash) {
    return new Response(JSON.stringify({ error: 'No PIN set for this venue' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const match = await bcrypt.compare(pin, venue.staff_pin_hash)

  if (!match) {
    // Artificial delay to slow brute force
    await new Promise(r => setTimeout(r, 500))

    const newFailCount = (venue.staff_pin_fail_count ?? 0) + 1
    const update: Record<string, unknown> = { staff_pin_fail_count: newFailCount }

    if (newFailCount >= 10) {
      update.staff_pin_locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      update.staff_pin_fail_count = 0
    }

    await supabase.from('venues').update(update).eq('id', venue_id)

    const status = newFailCount >= 10 ? 429 : 401
    return new Response(JSON.stringify({ error: 'Invalid PIN' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Success — reset fail counter
  await supabase.from('venues').update({ staff_pin_fail_count: 0, staff_pin_locked_until: null }).eq('id', venue_id)

  // Issue JWT (8 hours)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STAFF_JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60
  const token = await create({ alg: 'HS256', typ: 'JWT' }, { role: 'staff', venue_id, exp }, key)

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
